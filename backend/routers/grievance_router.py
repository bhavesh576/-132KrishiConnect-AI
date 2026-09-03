from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from database import get_db
from schemas import GrievanceCreate, GrievancePatch

router = APIRouter(prefix="/grievance", tags=["grievance"])


@router.post("")
def create_grievance(body: GrievanceCreate, db: Session = Depends(get_db)):
    g = models.Grievance(**body.model_dump())
    db.add(g)
    db.commit()
    db.refresh(g)
    return _g(g, db)


@router.get("")
def list_grievances(status: str = "", farmer_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(models.Grievance)
    if status:
        q = q.filter(models.Grievance.status == status)
    if farmer_id:
        q = q.filter(models.Grievance.farmer_id == farmer_id)
    rows = q.order_by(models.Grievance.created_at.desc()).all()
    return [_g(g, db) for g in rows]


@router.patch("/{grievance_id}")
def update_status(grievance_id: int, body: GrievancePatch, db: Session = Depends(get_db)):
    """Simulated resolution — status field update only (per spec)."""
    g = db.get(models.Grievance, grievance_id)
    if not g:
        return {"error": "not found"}
    if body.status not in ("OPEN", "IN_REVIEW", "RESOLVED"):
        return {"error": "bad status"}
    g.status = body.status
    db.commit()
    return _g(g, db)


def _g(g: models.Grievance, db: Session) -> dict:
    farmer = db.get(models.Farmer, g.farmer_id)
    return {"grievance_id": g.grievance_id, "txn_id": g.txn_id,
            "farmer_id": g.farmer_id, "farmer_name": farmer.name if farmer else None,
            "category": g.category, "description": g.description,
            "status": g.status,
            "created_at": g.created_at.isoformat() if g.created_at else None}
