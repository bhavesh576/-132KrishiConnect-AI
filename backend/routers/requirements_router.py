import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from engines.demand_pull import match_requirement
from engines.engine_context import static_ctx
from schemas import RequirementCreate

router = APIRouter(prefix="/requirements", tags=["requirements"])


def _dist_fn(sctx, destination_district: str):
    primary = None
    for m in sctx.mandis.values():
        if m["district"] == destination_district:
            primary = m
            break
    def dist(mandi_id):
        if not primary or mandi_id not in sctx.mandis:
            return 9999.0
        t = sctx.transport[(mandi_id, primary["mandi_id"])]
        return t.distance_km
    return dist


def _enrich(db: Session, result: dict):
    farmer_ids = {m["farmer_id"] for m in result["matches"] if m["farmer_id"]}
    fpo_ids = {m["fpo_id"] for m in result["matches"] if m["fpo_id"]}
    farmers = {f.farmer_id: f.name for f in db.query(models.Farmer)
               .filter(models.Farmer.farmer_id.in_(farmer_ids or {0})).all()}
    fpos = {f.fpo_id: f.name for f in db.query(models.FPO)
            .filter(models.FPO.fpo_id.in_(fpo_ids or {0})).all()}
    for m in result["matches"]:
        lot = db.get(models.Lot, m["lot_id"])
        m["lot_status"] = lot.status if lot else None
        m["farmer_name"] = farmers.get(m["farmer_id"],
                                       fpos.get(m["fpo_id"], "FPO pooled lot") if m["fpo_id"] else "Unknown")
        m["fpo_name"] = fpos.get(m["fpo_id"])
    return result


@router.post("")
def post_requirement(body: RequirementCreate, db: Session = Depends(get_db)):
    req = models.BuyerRequirement(**body.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"req_id": req.req_id, "status": req.status}


@router.get("/buyer/{buyer_id}")
def buyer_requirements(buyer_id: int, db: Session = Depends(get_db)):
    rows = db.query(models.BuyerRequirement)\
        .filter(models.BuyerRequirement.buyer_id == buyer_id)\
        .order_by(models.BuyerRequirement.created_at.desc()).all()
    return [{"req_id": r.req_id, "crop": r.crop, "quantity_tonnes": r.quantity_tonnes,
             "grade": r.grade, "destination_district": r.destination_district,
             "deadline_date": r.deadline_date.isoformat(), "status": r.status,
             "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in rows]



@router.get("/open")
def open_requirements(db: Session = Depends(get_db)):
    """All OPEN buyer requirements (FPO desk: 'requirements available to pool')."""
    rows = (db.query(models.BuyerRequirement)
              .filter(models.BuyerRequirement.status == "OPEN")
              .order_by(models.BuyerRequirement.created_at.desc()).all())
    buyers = {b.buyer_id: b for b in db.query(models.Buyer).all()}
    return [{"req_id": r.req_id, "crop": r.crop, "quantity_tonnes": r.quantity_tonnes,
             "grade": r.grade, "destination_district": r.destination_district,
             "deadline_date": r.deadline_date.isoformat(), "status": r.status,
             "buyer_name": buyers[r.buyer_id].name if r.buyer_id in buyers else None,
             "buyer_type": buyers[r.buyer_id].buyer_type if r.buyer_id in buyers else None}
            for r in rows]


@router.get("/{req_id}/matches")
def requirement_matches(req_id: int, db: Session = Depends(get_db)):
    sctx = static_ctx()
    req = db.get(models.BuyerRequirement, req_id)
    if not req:
        raise HTTPException(404, "Requirement not found")
    lot_rows = db.query(models.Lot).filter(models.Lot.status.in_(["LISTED", "POOLED"])).all()
    pooled_rows = [l for l in lot_rows if l.status == "POOLED"]
    lot_rows = [l for l in lot_rows if l.status == "LISTED"]
    result = match_requirement(req, lot_rows, pooled_rows, _dist_fn(sctx, req.destination_district))

    # persist match rows (overwrite previous computation for this requirement)
    db.query(models.RequirementMatch).filter(models.RequirementMatch.req_id == req_id).delete()
    for m in result["matches"]:
        db.add(models.RequirementMatch(req_id=req_id, lot_id=m["lot_id"],
                                       matched_tonnes=m["matched_tonnes"],
                                       source_type=m["source_type"]))
    db.commit()
    result = _enrich(db, result)
    result["requirement"] = {
        "req_id": req.req_id, "crop": req.crop, "grade": req.grade,
        "quantity_tonnes": req.quantity_tonnes,
        "destination_district": req.destination_district,
        "deadline_date": req.deadline_date.isoformat(), "status": req.status}
    return result
