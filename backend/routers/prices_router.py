from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
from database import get_db
from engines.engine_context import static_ctx

router = APIRouter(prefix="/prices", tags=["prices"])


@router.get("")
def prices(crop: str, mandi: str = "", days: int = 90, db: Session = Depends(get_db)):
    """Daily modal prices for one crop, one or more mandis (comma-sep ids or
    'all'), last N days. Synthetic Agmarknet-style panel — NOT a live feed."""
    days = min(days, 400)
    sctx = static_ctx()
    q = db.query(models.MandiPrice).filter(models.MandiPrice.crop == crop)
    ids = []
    if mandi and mandi != "all":
        ids = [int(x) for x in mandi.split(",") if x.strip()]
        q = q.filter(models.MandiPrice.mandi_id.in_(ids))
    latest = q.order_by(models.MandiPrice.date.desc()).first()
    if not latest:
        return {"series": [], "mandis": []}
    from datetime import date, timedelta
    start = (date.fromisoformat(latest.date) - timedelta(days=days)).isoformat()
    rows = (q.filter(models.MandiPrice.date >= start)
             .order_by(models.MandiPrice.date).all())
    mandi_meta = [{"mandi_id": m["mandi_id"], "mandi_name": m["mandi_name"],
                   "district": m["district"]} for m in sctx.mandis.values()
                  if not ids or m["mandi_id"] in ids]
    return {"series": [{"date": r.date, "mandi_id": r.mandi_id,
                        "mandi_name": r.mandi_name,
                        "modal_price_per_qtl": r.modal_price_per_qtl,
                        "arrival_qty_tonnes": r.arrival_qty_tonnes} for r in rows],
            "mandis": mandi_meta}


@router.get("/heatmap")
def heatmap(crop: str, date: str = "", db: Session = Depends(get_db)):
    """Price color-scale across all 25 mandis for one crop/day (map markers)."""
    q = db.query(models.MandiPrice).filter(models.MandiPrice.crop == crop)
    if date:
        q = q.filter(models.MandiPrice.date <= date)
    latest = q.order_by(models.MandiPrice.date.desc()).first()
    if not latest:
        return {"date": None, "points": []}
    rows = (db.query(models.MandiPrice)
              .filter(models.MandiPrice.crop == crop,
                      models.MandiPrice.date == latest.date).all())
    return {"date": latest.date,
            "points": [{"mandi_id": r.mandi_id, "mandi_name": r.mandi_name,
                        "district": r.district, "lat": r.lat, "lon": r.lon,
                        "modal_price_per_qtl": r.modal_price_per_qtl,
                        "arrival_qty_tonnes": r.arrival_qty_tonnes} for r in rows]}


@router.get("/mandis")
def mandis():
    sctx = static_ctx()
    return sorted(sctx.mandis.values(), key=lambda m: m["mandi_id"])


@router.get("/crops")
def crops():
    return static_ctx().crop_list()
