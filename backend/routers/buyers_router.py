from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from database import get_db
from engines.buyer_match import rank_buyers_for_lot
from engines.engine_context import static_ctx

router = APIRouter(tags=["buyers"])


@router.get("/buyers")
def buyers(crop: str = "", district: str = "", lot_id: int = 0,
           db: Session = Depends(get_db)):
    """Ranked buyer list. With lot_id: full weighted match_pct (Section 6.4)
    with per-component breakdown; the displayed pct IS the ranking value."""
    sctx = static_ctx()
    q = db.query(models.Buyer)
    if crop:
        q = q.filter(models.Buyer.interested_crop == crop)
    if district:
        q = q.filter(models.Buyer.district == district)
    rows = q.all()

    if not lot_id:
        return [{"buyer_id": b.buyer_id, "name": b.name, "buyer_type": b.buyer_type,
                 "district": b.district, "verified_flag": b.verified_flag,
                 "payment_reliability_score": b.payment_reliability_score,
                 "avg_payment_days": b.avg_payment_days,
                 "interested_crop": b.interested_crop,
                 "typical_need_tonnes": b.typical_need_tonnes,
                 "min_grade": b.min_grade} for b in rows]

    lot = db.get(models.Lot, lot_id)
    if not lot:
        return []
    lot_d = {"crop": lot.crop, "grade": lot.grade, "quantity_tonnes": lot.quantity_tonnes}
    lot_mandi = sctx.mandis.get(lot.current_location_mandi_id)
    mandi_by_district = {}
    for m in sctx.mandis.values():
        mandi_by_district.setdefault(m["district"], m)
    ranked = rank_buyers_for_lot(lot_d, rows, lot_mandi, mandi_by_district)
    for r in ranked:  # attach lot context for the UI
        r["lot_crop"] = lot.crop
        r["lot_grade"] = lot.grade
    return ranked
