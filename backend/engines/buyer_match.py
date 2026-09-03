"""6.4 buyer_match.py — weighted-criteria scoring (transparent, NOT "AI").

IMPORTANT (spec): the displayed match_pct MUST be the same raw*100 value used
for the ranking order. We compute it once and sort by it — no separate metric.
"""
WEIGHTS = {"crop": 0.30, "qty": 0.15, "quality": 0.20, "dist": 0.15, "pay": 0.20}
MAX_DISTANCE_KM = 400  # config constant for distance_score denominator

GRADE_RANK = {"C": 1, "B": 2, "A": 3}


def score_buyer(buyer, lot: dict, distance_km: float) -> dict:
    crop_match = 1.0 if buyer.interested_crop == lot["crop"] else 0.0
    typical = buyer.typical_need_tonnes or 1.0
    qty_fit = max(0.0, min(1.0, 1 - abs(typical - lot["quantity_tonnes"]) / typical))
    quality_match = 1.0 if GRADE_RANK.get(lot["grade"], 0) >= GRADE_RANK.get(buyer.min_grade, 1) else 0.0
    distance_score = max(0.0, min(1.0, 1 - distance_km / MAX_DISTANCE_KM))
    payment_score = buyer.payment_reliability_score / 100.0

    raw = (WEIGHTS["crop"] * crop_match + WEIGHTS["qty"] * qty_fit
           + WEIGHTS["quality"] * quality_match + WEIGHTS["dist"] * distance_score
           + WEIGHTS["pay"] * payment_score)
    match_pct = round(raw * 100)  # SINGLE source of truth for display AND ranking

    return {
        "buyer_id": buyer.buyer_id,
        "name": buyer.name,
        "buyer_type": buyer.buyer_type,
        "district": buyer.district,
        "verified_flag": buyer.verified_flag,
        "payment_reliability_score": buyer.payment_reliability_score,
        "avg_payment_days": buyer.avg_payment_days,
        "distance_km": round(distance_km, 1),
        "match_pct": match_pct,
        "components": {
            "crop_match": crop_match, "qty_fit": round(qty_fit, 3),
            "quality_match": quality_match, "distance_score": round(distance_score, 3),
            "payment_score": round(payment_score, 3),
        },
        "formula": (
            "match = 0.30×crop({cm}) + 0.15×qty({qf}) + 0.20×quality({ql}) "
            "+ 0.15×dist({ds}) + 0.20×payment({ps}) = {raw:.3f} → {pct}%"
        ).format(cm=crop_match, qf=round(qty_fit, 2), ql=quality_match,
                 ds=round(distance_score, 2), ps=round(payment_score, 2), raw=raw, pct=match_pct),
        "_raw": raw,
    }


def rank_buyers_for_lot(lot: dict, buyers, lot_mandi: dict, mandi_by_district: dict) -> list:
    ranked = []
    for b in buyers:
        bmandi = mandi_by_district.get(b.district)
        dist = 0.0
        if bmandi and lot_mandi:
            dist = ((bmandi["lat"] - lot_mandi["lat"]) ** 2 + (bmandi["lon"] - lot_mandi["lon"]) ** 2) ** 0.5 * 111.0
        ranked.append(score_buyer(b, lot, dist))
    ranked.sort(key=lambda x: x["_raw"], reverse=True)
    for r in ranked:
        r.pop("_raw", None)
    return ranked
