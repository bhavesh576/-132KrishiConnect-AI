"""6.6 fpo_premium.py — stepped pooling premium. Configurable constants below
(commented, per spec) — no hidden magic numbers.
"""
BASE_PREMIUM_PCT = 2.0        # % premium before any volume steps
STEP_TONNES = 5               # every 5 pooled tonnes...
STEP_INCREMENT_PCT = 1.0      # ...adds 1 percentage point
MAX_PREMIUM_PCT = 15.0        # hard cap


def premium_pct_for(pooled_tonnes: float) -> float:
    return min(MAX_PREMIUM_PCT,
               BASE_PREMIUM_PCT + (int(pooled_tonnes // STEP_TONNES) * STEP_INCREMENT_PCT))


def compute_premium(pooled_tonnes: float, member_net_prices: list) -> dict:
    """member_net_prices: [(qty_qtl, net_per_qtl), ...] of member lots.
    pooled_net_price = weighted_avg(member nets) × (1 + premium_pct)."""
    premium_pct = premium_pct_for(pooled_tonnes)
    total_qtl = sum(q for q, _ in member_net_prices)
    if total_qtl > 0:
        wavg = sum(q * p for q, p in member_net_prices) / total_qtl
    else:
        wavg = 0.0
    pooled_net = wavg * (1 + premium_pct / 100.0)

    steps = int(pooled_tonnes // STEP_TONNES)
    return {
        "pooled_tonnes": pooled_tonnes,
        "premium_pct": premium_pct,
        "weighted_avg_net_per_qtl": round(wavg, 2),
        "pooled_net_price_per_qtl": round(pooled_net, 2),
        "constants": {
            "base_premium_pct": BASE_PREMIUM_PCT,
            "step_tonnes": STEP_TONNES,
            "step_increment_pct": STEP_INCREMENT_PCT,
            "max_premium_pct": MAX_PREMIUM_PCT,
        },
        "formula": (
            f"premium = min({MAX_PREMIUM_PCT:.0f}%, {BASE_PREMIUM_PCT:.0f}% + floor({pooled_tonnes:,.0f}/{STEP_TONNES})×{STEP_INCREMENT_PCT:.0f}% "
            f"= {BASE_PREMIUM_PCT:.0f}% + {steps}×{STEP_INCREMENT_PCT:.0f}% = {premium_pct:.0f}%)"
        ),
    }
