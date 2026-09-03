"""6.1 net_realisation.py — THE core formula. Implemented literally per spec.

compute_net(lot, candidate_mandi, day_offset) -> dict with EVERY intermediate
number. The full dict is always returned and stored (breakdown_json) — never
just `net` alone.

Units convention (documented in build report):
  - lot quantities stored internally in TONNES; per-unit prices/costs in ₹/qtl
  - 1 tonne = 10 quintals (conversion at the edge of the engines)
"""
from datetime import timedelta

QTL_PER_TONNE = 10


def compute_net(lot: dict, mandi: dict, day_offset: int, sctx, prices: dict):
    """lot: {crop, grade, harvest_date(date), current_mandi_id}
    mandi: {mandi_id, mandi_name, ...}   prices: {(mandi_id,'YYYY-MM-DD'): modal}
    Returns None if no seeded price exists for that mandi/day."""
    key = (mandi["mandi_id"], (lot["harvest_date"] + timedelta(days=day_offset)).isoformat())
    modal = prices.get(key)
    if modal is None:
        return None

    # gross = modal × (1 + grade adjustment)
    pct_adj = sctx.grade_adj.get((lot["crop"], lot["grade"]), 0.0)
    gross = modal * (1 + pct_adj / 100.0)

    # transport = fixed loading + distance × per-qtl-per-km (from pair table)
    tc = sctx.transport[(lot["current_mandi_id"], mandi["mandi_id"])]
    transport = tc.fixed_loading_cost + tc.distance_km * tc.cost_per_qtl_per_km

    # storage = per-day cost × days (0 on day 0)
    sc = sctx.storage[lot["crop"]]
    storage = 0 if day_offset == 0 else sc.cost_per_qtl_per_day * day_offset

    # spoilage = gross × %/day × grade multiplier × days
    sp = sctx.spoilage[lot["crop"]]
    spoilage = gross * (sp.spoilage_pct_per_day / 100.0) * sp.grade_multiplier * day_offset

    net = gross - transport - storage - spoilage

    return {
        "mandi_id": mandi["mandi_id"],
        "mandi_name": mandi["mandi_name"],
        "district": mandi["district"],
        "day_offset": day_offset,
        "date": key[1],
        "modal_price_per_qtl": round(modal, 2),
        "grade_pct_adjustment": pct_adj,
        "gross_per_qtl": round(gross, 2),
        "transport_per_qtl": round(transport, 2),
        "transport_distance_km": round(tc.distance_km, 1),
        "storage_per_qtl": round(storage, 2),
        "spoilage_per_qtl": round(spoilage, 2),
        "net_per_qtl": round(net, 2),
    }
