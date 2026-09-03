from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from database import get_db
from engines.engine_context import static_ctx, load_prices
from engines.sale_window import grid_search

router = APIRouter(prefix="/admin", tags=["admin"])

LOTS_PER_FARMER_PER_YEAR = 2.5  # modelled assumption — illustrative only


@router.get("/coverage")
def coverage(db: Session = Depends(get_db)):
    sctx = static_ctx()
    farmers = db.query(models.Farmer).all()
    buyers = db.query(models.Buyer).all()
    fpos = db.query(models.FPO).all()
    lots = db.query(models.Lot).all()
    by_district = {}
    for f in farmers:
        d = by_district.setdefault(f.district, {"district": f.district,
                                                "farmers": 0, "buyers": 0, "fpos": 0, "lots": 0})
        d["farmers"] += 1
    for b in buyers:
        by_district.setdefault(b.district, {"district": b.district, "farmers": 0,
                                            "buyers": 0, "fpos": 0, "lots": 0})["buyers"] += 1
    for o in fpos:
        by_district.setdefault(o.district, {"district": o.district, "farmers": 0,
                                            "buyers": 0, "fpos": 0, "lots": 0})["fpos"] += 1
    for l in lots:
        m = sctx.mandis.get(l.current_location_mandi_id)
        if m:
            by_district.setdefault(m["district"], {"district": m["district"], "farmers": 0,
                                                   "buyers": 0, "fpos": 0, "lots": 0})["lots"] += 1
    rows = [{"district": d["district"], "farmers": d["farmers"], "buyers": d["buyers"],
             "fpos": d["fpos"], "lots": d["lots"],
             "lat": next((m["lat"] for m in sctx.mandis.values() if m["district"] == d["district"]), None),
             "lon": next((m["lon"] for m in sctx.mandis.values() if m["district"] == d["district"]), None)}
            for d in sorted(by_district.values(), key=lambda x: -x["farmers"])]
    return {"totals": {"farmers": len(farmers), "buyers": len(buyers),
                       "fpos": len(fpos), "lots": len(lots),
                       "mandis": len(sctx.mandis), "crops": len(sctx.crop_list())},
            "by_district": rows}


@router.get("/impact-model")
def impact_model(adoption: int = 10000, db: Session = Depends(get_db)):
    """FORMULA-BASED MODELLED impact — NOT measured. Response is flagged
    "illustrative": true and the UI must keep the illustrative badge visible."""
    lots = db.query(models.Lot).filter(models.Lot.status.in_(["DRAFT", "LISTED", "POOLED"])).all()
    sctx = static_ctx()
    uplifts, values = [], []
    for lot in lots:
        prices = load_prices(lot.crop, lot.harvest_date, lot.harvest_date)
        rows = [g for g in grid_search({"crop": lot.crop, "grade": lot.grade,
                                        "harvest_date": lot.harvest_date,
                                        "current_mandi_id": lot.current_location_mandi_id},
                                       sctx, prices) if g["day_offset"] == 0]
        if not rows:
            continue
        best = max(rows, key=lambda g: g["net_per_qtl"])
        local = next((g["net_per_qtl"] for g in rows
                      if g["mandi_id"] == lot.current_location_mandi_id), None)
        if local and local > 0 and best["mandi_id"] != lot.current_location_mandi_id:
            uplifts.append((best["net_per_qtl"] - local) / local)
        values.append(best["net_per_qtl"] * lot.quantity_tonnes * 10)
    avg_uplift = sum(uplifts) / len(uplifts) if uplifts else 0.0
    avg_lot_value = sum(values) / len(values) if values else 0.0
    projected = adoption * LOTS_PER_FARMER_PER_YEAR * avg_uplift * avg_lot_value
    return {
        "illustrative": True,
        "disclaimer": "Modelled impact (formula-based, illustrative) — not measured adoption.",
        "inputs": {"adoption_farmers": adoption,
                   "lots_per_farmer_per_year": LOTS_PER_FARMER_PER_YEAR,
                   "avg_net_uplift_pct": round(avg_uplift * 100, 2),
                   "avg_lot_value_inr": round(avg_lot_value, 2),
                   "lots_sampled": len(values)},
        "projected_annual_benefit_inr": round(projected, 0),
        "formula": (f"projected = adoption({adoption:,}) × lots/farmer/yr({LOTS_PER_FARMER_PER_YEAR}) "
                    f"× avg uplift({avg_uplift * 100:.2f}%) × avg lot value(₹{avg_lot_value:,.0f}) "
                    f"= ₹{projected:,.0f} / year"),
    }


@router.get("/grievances")
def all_grievances(status: str = "", db: Session = Depends(get_db)):
    import models as _m
    from routers.grievance_router import list_grievances
    return list_grievances(status=status or "", farmer_id=0, db=db)
