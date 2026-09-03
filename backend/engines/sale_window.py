"""6.2 sale_window.py — grid-search over 25 mandis × day 0..30, exact rules.

Rule order is the spec's, applied in this exact order:
  1. storage OFF      -> SELL_NOW (local) / SWITCH_MANDI (never HOLD)
  2. cash need        -> PARTIAL_SALE if required qty < lot qty, else SELL_NOW
  3. best_future > best_today × 1.03 -> HOLD
  4. else             -> SELL_NOW
"""
from .net_realisation import compute_net, QTL_PER_TONNE
from .engine_context import GRID_MAX_DAYS

HOLD_THRESHOLD_PCT = 3.0  # spec constant: future must beat today by >3% to HOLD


def grid_search(lot: dict, sctx, prices: dict):
    results = []
    for m in sctx.mandis.values():
        for d in range(0, GRID_MAX_DAYS + 1):
            r = compute_net(lot, m, d, sctx, prices)
            if r is not None:
                results.append(r)
    return results


def recommend(lot: dict, sctx, prices: dict) -> dict:
    """lot dict: crop, grade, harvest_date, current_mandi_id, storage_available,
    cash_need_amount, cash_need_by_date, quantity_tonnes."""
    grid = grid_search(lot, sctx, prices)
    today_rows = [g for g in grid if g["day_offset"] == 0]
    future_rows = [g for g in grid if g["day_offset"] >= 1]
    if not today_rows:
        return {"recommendation_type": "NO_DATA", "reason": "No seeded price data for this lot date."}

    best_today = max(today_rows, key=lambda g: g["net_per_qtl"])
    best_future = max(future_rows, key=lambda g: g["net_per_qtl"]) if future_rows else best_today

    current_mandi = sctx.mandi(lot["current_mandi_id"])
    qty_qtl = lot["quantity_tonnes"] * QTL_PER_TONNE
    uplift_vs_local = best_today["net_per_qtl"] - (
        next((g["net_per_qtl"] for g in today_rows if g["mandi_id"] == lot["current_mandi_id"]),
             best_today["net_per_qtl"]))
    future_uplift_pct = (best_future["net_per_qtl"] / best_today["net_per_qtl"] - 1) * 100

    rec = {
        "best_today": best_today,
        "best_future": best_future,
        "grid": grid,
        "constants": {"hold_threshold_pct": HOLD_THRESHOLD_PCT, "grid_max_days": GRID_MAX_DAYS},
        "inputs": {
            "crop": lot["crop"], "grade": lot["grade"],
            "harvest_date": lot["harvest_date"].isoformat(),
            "quantity_tonnes": lot["quantity_tonnes"], "quantity_qtl": qty_qtl,
            "current_mandi_id": lot["current_mandi_id"],
            "current_mandi_name": current_mandi["mandi_name"],
            "storage_available": lot["storage_available"],
            "cash_need_amount": lot.get("cash_need_amount"),
            "cash_need_by_date": lot.get("cash_need_by_date").isoformat() if lot.get("cash_need_by_date") else None,
            "max_safe_storage_days": sctx.storage[lot["crop"]].max_safe_storage_days,
        },
    }

    # ---- RULE 1: no storage -> never HOLD ----
    if not lot["storage_available"]:
        if best_today["mandi_id"] == lot["current_mandi_id"]:
            rec.update(recommendation_type="SELL_NOW", best_mandi=best_today, day_offset=0,
                       rule_branch="RULE_1_NO_STORAGE_LOCAL",
                       reason=f"Storage is OFF, and your local mandi {best_today['mandi_name']} already gives the best net price today (₹{best_today['net_per_qtl']:,.0f}/qtl).")
        else:
            rec.update(recommendation_type="SWITCH_MANDI", best_mandi=best_today, day_offset=0,
                       rule_branch="RULE_1_NO_STORAGE_SWITCH",
                       reason=f"Storage is OFF so you cannot wait. Best net today is ₹{best_today['net_per_qtl']:,.0f}/qtl at {best_today['mandi_name']} — ₹{uplift_vs_local:,.0f}/qtl more than selling at {current_mandi['mandi_name']}.")
        return rec

    # ---- RULE 2: cash need -> PARTIAL or full SELL_NOW ----
    if lot.get("cash_need_amount"):
        required_qty_qtl = lot["cash_need_amount"] / best_today["net_per_qtl"]
        rec["inputs"]["required_qty_qtl"] = round(required_qty_qtl, 2)
        if required_qty_qtl < qty_qtl:
            rec.update(recommendation_type="PARTIAL_SALE", best_mandi=best_today, day_offset=0,
                       rule_branch="RULE_2_CASH_NEED_PARTIAL",
                       reason=f"You need ₹{lot['cash_need_amount']:,.0f} by {lot['cash_need_by_date'].isoformat() if lot.get('cash_need_by_date') else 'the deadline'}. Selling {required_qty_qtl/10:,.2f} t today at {best_today['mandi_name']} covers it — hold the rest for the better price.")
        else:
            rec.update(recommendation_type="SELL_NOW", best_mandi=best_today, day_offset=0,
                       rule_branch="RULE_2_CASH_NEED_FULL",
                       reason=f"Your cash need of ₹{lot['cash_need_amount']:,.0f} requires the ENTIRE lot at today's best net of ₹{best_today['net_per_qtl']:,.0f}/qtl.")
        return rec

    # ---- RULE 3: HOLD if future beats today by >3% ----
    if best_future["net_per_qtl"] > best_today["net_per_qtl"] * (1 + HOLD_THRESHOLD_PCT / 100.0):
        rec.update(recommendation_type="HOLD", best_mandi=best_future,
                   day_offset=best_future["day_offset"], rule_branch="RULE_3_HOLD",
                   reason=f"{best_future['mandi_name']} price in {best_future['day_offset']} days is expected to net you {future_uplift_pct:,.0f}% more than selling today at {best_today['mandi_name']} (₹{best_future['net_per_qtl']:,.0f} vs ₹{best_today['net_per_qtl']:,.0f} per qtl).")
        return rec

    # ---- RULE 4: default ----
    rec.update(recommendation_type="SELL_NOW", best_mandi=best_today, day_offset=0,
               rule_branch="RULE_4_DEFAULT",
               reason=f"No future option beats today by more than {HOLD_THRESHOLD_PCT:.0f}%. Selling now at {best_today['mandi_name']} (₹{best_today['net_per_qtl']:,.0f}/qtl) is the best net.")
    return rec


def top_n(grid: list, n: int = 5) -> list:
    return sorted(grid, key=lambda g: g["net_per_qtl"], reverse=True)[:n]
