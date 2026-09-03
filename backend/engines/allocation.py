"""6.3 allocation.py — sell/hold/pool split. Only called for PARTIAL_SALE or
when FPO pooling applies. Constants below are CONFIG, not hidden magic numbers.
"""
from .net_realisation import QTL_PER_TONNE

FPO_MIN_POOL_THRESHOLD_T = 1.0  # tonnes — remaining lot must exceed this to pool
POOL_SHARE = 0.4                # 40% of the remaining tonnage goes to the FPO pool


def allocate(quantity_tonnes: float, cash_need_amount, best_today_net_per_qtl: float,
             fpo_pool_available: bool) -> dict:
    """cash_need_amount None -> nothing forced to sell; whole lot is 'remaining'."""
    if cash_need_amount and best_today_net_per_qtl > 0:
        sell_now = min(cash_need_amount / best_today_net_per_qtl, quantity_tonnes * QTL_PER_TONNE) / QTL_PER_TONNE
    else:
        sell_now = 0.0
    sell_now = min(sell_now, quantity_tonnes)
    remaining = quantity_tonnes - sell_now

    if fpo_pool_available and remaining > FPO_MIN_POOL_THRESHOLD_T:
        pool_fpo = remaining * POOL_SHARE
        hold = remaining - pool_fpo
        pool_applied = True
    else:
        pool_fpo = 0.0
        hold = remaining
        pool_applied = False

    return {
        "sell_now_tonnes": round(sell_now, 3),
        "hold_tonnes": round(hold, 3),
        "pool_fpo_tonnes": round(pool_fpo, 3),
        "fpo_pool_applied": pool_applied,
        "breakdown": {
            "lot_tonnes": quantity_tonnes,
            "cash_need_amount": cash_need_amount,
            "best_today_net_per_qtl": round(best_today_net_per_qtl, 2),
            "formula": (
                f"sell_now = min(cash_need / best_today_net, lot_qty) "
                f"= min({cash_need_amount or 0:,.0f} / {best_today_net_per_qtl:,.2f}, {quantity_tonnes}) t"
                if cash_need_amount else "no cash need -> sell_now = 0 t"
            ),
            "remaining_tonnes": round(remaining, 3),
            "fpo_pool_available": fpo_pool_available,
            "fpo_min_pool_threshold_t": FPO_MIN_POOL_THRESHOLD_T,
            "pool_share_constant": POOL_SHARE,
            "pool_formula": (
                f"pool = remaining × {POOL_SHARE:.0%} = {remaining:,.2f} × {POOL_SHARE:.0%} = {pool_fpo:,.2f} t"
                if pool_applied else "pooling not applied (FPO unavailable or remaining ≤ 1 t)"),
        },
    }
