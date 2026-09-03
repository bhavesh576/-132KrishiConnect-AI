"""Run the full seed, print a summary, and VERIFY the demo golden record by
executing the real engines (build order step 11.2 manual test).

Usage:  cd backend && python -m seed.run_all_seed
"""
import os
import sys
from datetime import timedelta

from database import Base, engine, SessionLocal
import models


def main():
    from seed import cost_tables, generate_prices, generate_registry

    print("=" * 64)
    print("KrishiConnect seed — starting (demo date =", date.today(), ")")
    print("=" * 64)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    cost_tables.main()
    generate_prices.main()
    generate_registry.main()

    db = SessionLocal()
    try:
        counts = {n: db.query(m).count() for n, m in [
            ("mandi_prices", models.MandiPrice), ("farmers", models.Farmer),
            ("buyers", models.Buyer), ("fpos", models.FPO),
            ("lots", models.Lot), ("requirements", models.BuyerRequirement)]}
        print("-" * 64)
        print("ROW COUNTS: " + ", ".join(f"{k}={v:,}" for k, v in counts.items()))
        expect = 25 * 12
        assert counts["farmers"] == 500 and counts["buyers"] == 300 \
            and counts["fpos"] == 150 and counts["mandi_prices"] >= expect * 1300, \
            "seed scale check failed"
    finally:
        db.close()

    verify_golden_record()
    print("=" * 64)
    print("SEED COMPLETE — golden record verified ✔")
    print("=" * 64)


def verify_golden_record():
    """Replays Section 12 demo steps 2-5 against the REAL engines."""
    from seed.generate_prices import DEMO_DATE, GOLDEN_HOLD_NET, GOLDEN_TODAY_NET
    from engines.engine_context import static_ctx, load_prices, price_window_for
    from engines.sale_window import recommend, top_n
    from engines.allocation import allocate

    sctx = static_ctx()
    base_lot = {
        "crop": "Onion", "grade": "A", "harvest_date": DEMO_DATE,
        "current_mandi_id": 3, "quantity_tonnes": 5.0,
    }
    lo, hi = price_window_for(DEMO_DATE)
    prices = load_prices("Onion", lo, hi)

    # --- storage ON, no cash need -> HOLD 5 days @ Aurangabad ≈ ₹4,694 ---
    rec = recommend({**base_lot, "storage_available": True, "cash_need_amount": None,
                     "cash_need_by_date": None}, sctx, prices)
    b = rec["best_mandi"]
    print(f"[golden] storage ON : {rec['recommendation_type']:13s} -> {b['mandi_name']:12s} "
          f"day {b['day_offset']}  net ₹{b['net_per_qtl']:,.2f}/qtl  ({rec['rule_branch']})")
    assert rec["recommendation_type"] == "HOLD", f"expected HOLD, got {rec['recommendation_type']}"
    assert b["mandi_id"] == 10 and b["day_offset"] == 5, "expected Aurangabad day 5"
    assert abs(b["net_per_qtl"] - GOLDEN_HOLD_NET) < 2, f"net {b['net_per_qtl']} != ≈{GOLDEN_HOLD_NET}"

    # --- storage OFF -> SWITCH_MANDI, never HOLD; best today = Lasalgaon ---
    rec2 = recommend({**base_lot, "storage_available": False, "cash_need_amount": None,
                      "cash_need_by_date": None}, sctx, prices)
    t = rec2["best_mandi"]
    print(f"[golden] storage OFF: {rec2['recommendation_type']:13s} -> {t['mandi_name']:12s} "
          f"day {t['day_offset']}  net ₹{t['net_per_qtl']:,.2f}/qtl  ({rec2['rule_branch']})")
    assert rec2["recommendation_type"] == "SWITCH_MANDI" and t["mandi_id"] == 1 \
        and abs(t["net_per_qtl"] - GOLDEN_TODAY_NET) < 1

    # --- cash need ₹80,000 -> PARTIAL_SALE 2.76t / 2.24t ---
    rec3 = recommend({**base_lot, "storage_available": True, "cash_need_amount": 80000.0,
                      "cash_need_by_date": DEMO_DATE + timedelta(days=4)}, sctx, prices)
    print(f"[golden] cash ₹80,000: {rec3['recommendation_type']} ({rec3['rule_branch']})")
    assert rec3["recommendation_type"] == "PARTIAL_SALE"
    al = allocate(5.0, 80000.0, rec2["best_mandi"]["net_per_qtl"], fpo_pool_available=False)
    print(f"[golden] allocation  : sell_now {al['sell_now_tonnes']} t · hold {al['hold_tonnes']} t "
          f"· pool {al['pool_fpo_tonnes']} t")
    assert abs(al["sell_now_tonnes"] - 2.76) < 0.01 and abs(al["hold_tonnes"] - 2.24) < 0.01
    alp = allocate(5.0, 80000.0, rec2["best_mandi"]["net_per_qtl"], fpo_pool_available=True)
    print(f"[golden] + FPO pool : sell {alp['sell_now_tonnes']} t · hold {alp['hold_tonnes']} t · "
          f"pool {alp['pool_fpo_tonnes']} t")
    assert abs(alp["pool_fpo_tonnes"] - 0.896) < 0.005

    print("[golden] top-5 alternatives:")
    for g in top_n(rec["grid"], 5):
        print(f"         {g['mandi_name']:22s} day {g['day_offset']:>2}  net ₹{g['net_per_qtl']:,.2f}")


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from datetime import date
    main()
