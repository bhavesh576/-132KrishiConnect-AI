import json
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from engines.engine_context import static_ctx, load_prices, price_window_for
from engines.net_realisation import QTL_PER_TONNE
from engines.sale_window import recommend, top_n
from engines.allocation import allocate
from schemas import LotCreate, LotPatch

router = APIRouter(tags=["lots"])


def _lot_dict(lot: models.Lot, sctx):
    d = {
        "lot_id": lot.lot_id, "farmer_id": lot.farmer_id, "fpo_id": lot.fpo_id,
        "crop": lot.crop, "quantity_tonnes": lot.quantity_tonnes,
        "quantity_qtl": lot.quantity_tonnes * QTL_PER_TONNE, "grade": lot.grade,
        "harvest_date": lot.harvest_date.isoformat(),
        "storage_available": lot.storage_available,
        "cash_need_amount": lot.cash_need_amount,
        "cash_need_by_date": lot.cash_need_by_date.isoformat() if lot.cash_need_by_date else None,
        "current_location_mandi_id": lot.current_location_mandi_id,
        "status": lot.status,
        "created_at": lot.created_at.isoformat() if lot.created_at else None,
    }
    if lot.current_location_mandi_id in sctx.mandis:
        m = sctx.mandi(lot.current_location_mandi_id)
        d["mandi_name"] = m["mandi_name"]
        d["district"] = m["district"]
    return d


def _lot_model(db: Session, lot_id: int) -> models.Lot:
    lot = db.get(models.Lot, lot_id)
    if not lot:
        raise HTTPException(404, "Lot not found")
    return lot


@router.post("/lots")
def create_lot(body: LotCreate, db: Session = Depends(get_db)):
    lot = models.Lot(**body.model_dump())
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return {"lot_id": lot.lot_id, "status": lot.status}


@router.get("/lots/farmer/{farmer_id}")
def farmer_lots(farmer_id: int, db: Session = Depends(get_db)):
    sctx = static_ctx()
    lots = db.query(models.Lot).filter(models.Lot.farmer_id == farmer_id)\
             .order_by(models.Lot.created_at.desc()).all()
    return [_lot_dict(l, sctx) for l in lots]


@router.get("/lots/{lot_id}")
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    return _lot_dict(_lot_model(db, lot_id), static_ctx())


@router.patch("/lots/{lot_id}")
def patch_lot(lot_id: int, body: LotPatch, db: Session = Depends(get_db)):
    """Live demo toggles (storage ON/OFF, cash need, offer listing status).
    exclude_unset (NOT exclude_none) so an explicit `"cash_need_amount": null`
    clears the field — without this, the cash-need toggle could never turn OFF."""
    lot = _lot_model(db, lot_id)
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(lot, field, val)
    db.commit()
    return _lot_dict(lot, static_ctx())


@router.get("/realisation/{lot_id}")
def realisation(lot_id: int, db: Session = Depends(get_db)):
    """FULL grid (25 mandis × 31 days) + best options — every intermediate number."""
    sctx = static_ctx()
    lot = _lot_model(db, lot_id)
    lo, hi = price_window_for(lot.harvest_date)
    prices = load_prices(lot.crop, lo, hi)
    lot_d = _lot_dict(lot, sctx)
    grid = []
    for m in sctx.mandis.values():
        for day in range(0, 31):
            from engines.net_realisation import compute_net
            r = compute_net({"crop": lot.crop, "grade": lot.grade,
                             "harvest_date": lot.harvest_date,
                             "current_mandi_id": lot.current_location_mandi_id},
                            m, day, sctx, prices)
            if r:
                grid.append(r)
    today_rows = [g for g in grid if g["day_offset"] == 0]
    future_rows = [g for g in grid if g["day_offset"] >= 1]
    best_today = max(today_rows, key=lambda g: g["net_per_qtl"]) if today_rows else None
    best_future = max(future_rows, key=lambda g: g["net_per_qtl"]) if future_rows else None
    return {"lot": lot_d, "grid": grid, "best_today": best_today,
            "best_future": best_future, "top5": top_n(grid, 5)}


@router.get("/recommendation/{lot_id}")
def recommendation(lot_id: int, db: Session = Depends(get_db)):
    """Recompute against current lot state, persist FULL breakdown_json
    (audit trail per Section 5), return decision + breakdown + top5."""
    sctx = static_ctx()
    lot = _lot_model(db, lot_id)
    lo, hi = price_window_for(lot.harvest_date)
    prices = load_prices(lot.crop, lo, hi)
    rec = recommend({"crop": lot.crop, "grade": lot.grade,
                     "harvest_date": lot.harvest_date,
                     "current_mandi_id": lot.current_location_mandi_id,
                     "storage_available": lot.storage_available,
                     "cash_need_amount": lot.cash_need_amount,
                     "cash_need_by_date": lot.cash_need_by_date,
                     "quantity_tonnes": lot.quantity_tonnes}, sctx, prices)

    best = rec["best_mandi"]
    alloc = None
    if rec["recommendation_type"] == "PARTIAL_SALE":
        alloc = allocate(lot.quantity_tonnes, lot.cash_need_amount,
                         rec["best_today"]["net_per_qtl"],
                         fpo_pool_available=lot.fpo_id is not None)

    breakdown = {"rule_branch": rec["rule_branch"], "reason": rec["reason"],
                 "inputs": rec["inputs"], "constants": rec["constants"],
                 "chosen": best, "best_today": rec["best_today"],
                 "best_future": rec["best_future"], "top10": top_n(rec["grid"], 10),
                 "allocation": alloc}
    db.add(models.Recommendation(
        lot_id=lot.lot_id, recommendation_type=rec["recommendation_type"],
        best_mandi_id=best["mandi_id"], best_day_offset=best["day_offset"],
        net_price_per_qtl=best["net_per_qtl"],
        breakdown_json=json.dumps(breakdown),
        sell_now_tonnes=alloc["sell_now_tonnes"] if alloc else None,
        hold_tonnes=alloc["hold_tonnes"] if alloc else None,
        pool_fpo_tonnes=alloc["pool_fpo_tonnes"] if alloc else None))
    db.commit()

    return {"recommendation_type": rec["recommendation_type"], "reason": rec["reason"],
            "best_mandi": best, "day_offset": best["day_offset"],
            "net_price_per_qtl": best["net_per_qtl"], "breakdown": breakdown}


@router.get("/allocation/{lot_id}")
def allocation(lot_id: int, fpo_pool: bool = False, db: Session = Depends(get_db)):
    sctx = static_ctx()
    lot = _lot_model(db, lot_id)
    if lot.fpo_id is None:
        fpo_pool = False
    lo, hi = price_window_for(lot.harvest_date)
    prices = load_prices(lot.crop, lo, hi)
    rec = recommend({"crop": lot.crop, "grade": lot.grade,
                     "harvest_date": lot.harvest_date,
                     "current_mandi_id": lot.current_location_mandi_id,
                     "storage_available": lot.storage_available,
                     "cash_need_amount": lot.cash_need_amount,
                     "cash_need_by_date": lot.cash_need_by_date,
                     "quantity_tonnes": lot.quantity_tonnes}, sctx, prices)
    best_today_net = rec["best_today"]["net_per_qtl"]
    result = allocate(lot.quantity_tonnes, lot.cash_need_amount, best_today_net,
                      fpo_pool_available=fpo_pool)
    return result
