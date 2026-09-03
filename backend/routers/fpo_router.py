from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from engines.engine_context import static_ctx, load_prices
from engines.fpo_premium import compute_premium
from engines.sale_window import grid_search
from schemas import PoolSimulate

router = APIRouter(prefix="/fpo", tags=["fpo"])


@router.get("/{fpo_id}/members")
def members(fpo_id: int, db: Session = Depends(get_db)):
    fpo = db.get(models.FPO, fpo_id)
    if not fpo:
        raise HTTPException(404, "FPO not found")
    links = db.query(models.FPOMember).filter(models.FPOMember.fpo_id == fpo_id).all()
    rows = []
    for link in links:
        f = db.get(models.Farmer, link.farmer_id)
        if not f:
            continue
        lots = db.query(models.Lot).filter(
            models.Lot.farmer_id == f.farmer_id,
            models.Lot.status.in_(["DRAFT", "LISTED", "POOLED"])).all()
        rows.append({
            "farmer_id": f.farmer_id, "name": f.name, "village": f.village,
            "district": f.district, "active_lots": len(lots),
            "total_tonnes": round(sum(l.quantity_tonnes for l in lots), 2),
        })
    return {"fpo": {"fpo_id": fpo.fpo_id, "name": fpo.name, "district": fpo.district,
                    "member_count": fpo.member_count, "contact": fpo.contact},
            "members": rows}


@router.post("/{fpo_id}/pool-simulate")
def pool_simulate(fpo_id: int, body: PoolSimulate, db: Session = Depends(get_db)):
    """6.6 fpo_premium — stepped premium, exact formula, full breakdown."""
    fpo = db.get(models.FPO, fpo_id)
    if not fpo:
        raise HTTPException(404, "FPO not found")
    links = db.query(models.FPOMember).filter(models.FPOMember.fpo_id == fpo_id).all()
    farmer_ids = [l.farmer_id for l in links]
    lots = (db.query(models.Lot)
              .filter(models.Lot.farmer_id.in_(farmer_ids or [0]),
                      models.Lot.status.in_(["LISTED", "DRAFT", "POOLED"])).all())
    sctx = static_ctx()
    member_lines = []
    weighted = []
    for lot in lots[:60]:  # prototype cap for response time
        lo, hi = lot.harvest_date, lot.harvest_date
        prices = load_prices(lot.crop, lo, hi)
        today_rows = [g for g in grid_search(
            {"crop": lot.crop, "grade": lot.grade, "harvest_date": lot.harvest_date,
             "current_mandi_id": lot.current_location_mandi_id}, sctx, prices)
            if g["day_offset"] == 0]
        if not today_rows:
            continue
        best = max(today_rows, key=lambda g: g["net_per_qtl"])
        qtl = lot.quantity_tonnes * 10
        weighted.append((qtl, best["net_per_qtl"]))
        member_lines.append({"lot_id": lot.lot_id, "crop": lot.crop,
                             "quantity_qtl": qtl, "net_per_qtl": best["net_per_qtl"]})
    result = compute_premium(body.tonnes, weighted)
    result["fpo"] = {"fpo_id": fpo.fpo_id, "name": fpo.name}
    result["member_lines"] = member_lines
    return result


@router.get("/membership/{farmer_id}")
def membership(farmer_id: int, db: Session = Depends(get_db)):
    """Demo helper: which FPO a farmer belongs to (frontend form pre-fill)."""
    link = db.query(models.FPOMember).filter(models.FPOMember.farmer_id == farmer_id).first()
    if not link:
        return {"fpo_id": None}
    fpo = db.get(models.FPO, link.fpo_id)
    return {"fpo_id": link.fpo_id, "fpo_name": fpo.name if fpo else None}
