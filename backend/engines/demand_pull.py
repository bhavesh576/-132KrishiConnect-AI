"""6.5 demand_pull.py — greedy matcher. Explicitly NON-ML.

Candidates: OPEN lots where crop matches and grade >= required grade,
ordered by distance to destination ASC, then grade DESC.
Farmer lots first, then FPO pooled lots; shortfall reported honestly.
"""
from datetime import date

GRADE_RANK = {"C": 1, "B": 2, "A": 3}


def _greedy(candidates, req, allocated: float):
    matches = []
    for lot in candidates:
        if allocated >= req.quantity_tonnes:
            break
        take = min(lot.quantity_tonnes, req.quantity_tonnes - allocated)
        if take <= 0:
            continue
        matches.append((lot, round(take, 3)))
        allocated += take
    return matches, allocated


def match_requirement(req, lot_rows, pooled_rows, dist_fn) -> dict:
    """req: BuyerRequirement row. lot_rows / pooled_rows: Lots with .current_location_mandi_id
    dist_fn(mandi_id) -> km to requirement destination."""
    farmer_candidates = sorted(
        (l for l in lot_rows if l.crop == req.crop
         and GRADE_RANK.get(l.grade, 0) >= GRADE_RANK.get(req.grade, 1)
         and l.status == "LISTED"),
        key=lambda l: (dist_fn(l.current_location_mandi_id), -GRADE_RANK.get(l.grade, 0)))

    matches, allocated = _greedy(farmer_candidates, req, 0.0)
    out = [{"lot_id": l.lot_id, "farmer_id": l.farmer_id, "fpo_id": l.fpo_id,
            "grade": l.grade, "matched_tonnes": t, "source_type": "FARMER",
            "distance_km": round(dist_fn(l.current_location_mandi_id), 1)}
           for l, t in matches]

    shortfall = req.quantity_tonnes - allocated
    if shortfall > 1e-9:
        pooled_candidates = sorted(
            (l for l in pooled_rows if l.crop == req.crop
             and GRADE_RANK.get(l.grade, 0) >= GRADE_RANK.get(req.grade, 1)
             and l.status == "POOLED"),
            key=lambda l: (dist_fn(l.current_location_mandi_id), -GRADE_RANK.get(l.grade, 0)))
        pool_matches, allocated = _greedy(pooled_candidates, req, allocated)
        out += [{"lot_id": l.lot_id, "farmer_id": l.farmer_id, "fpo_id": l.fpo_id,
                 "grade": l.grade, "matched_tonnes": t, "source_type": "FPO_POOL",
                 "distance_km": round(dist_fn(l.current_location_mandi_id), 1)}
                for l, t in pool_matches]

    return {
        "matches": out,
        "matched_tonnes": round(allocated, 3),
        "required_tonnes": req.quantity_tonnes,
        "shortfall_tonnes": round(max(req.quantity_tonnes - allocated, 0.0), 3),
    }
