import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db

router = APIRouter(tags=["offers+transactions"])

STAGES = ["OFFER_ACCEPTED", "TRUCK_ASSIGNED", "IN_TRANSIT", "DELIVERED", "PAYMENT_RELEASED"]


def _txn_dict(db: Session, t: models.Transaction) -> dict:
    offer = db.get(models.Offer, t.offer_id)
    lot = db.get(models.Lot, offer.lot_id) if offer else None
    buyer = db.get(models.Buyer, offer.buyer_id) if offer else None
    stage_idx = 0
    if t.logistics_status == "ASSIGNED":
        stage_idx = 1
    elif t.logistics_status == "IN_TRANSIT":
        stage_idx = 2
    elif t.logistics_status == "DELIVERED":
        stage_idx = 3
    if t.payment_status == "PAID":
        stage_idx = 4
    return {
        "txn_id": t.txn_id, "offer_id": t.offer_id,
        "lot_id": offer.lot_id if offer else None,
        "crop": lot.crop if lot else None, "grade": lot.grade if lot else None,
        "farmer_id": lot.farmer_id if lot else None,
        "buyer_id": offer.buyer_id if offer else None,
        "buyer_name": buyer.name if buyer else None,
        "final_price_per_qtl": t.final_price_per_qtl,
        "final_qty_tonnes": t.final_qty_tonnes,
        "order_value": round(t.final_price_per_qtl * t.final_qty_tonnes * 10, 2),
        "truck_id": t.truck_id,
        "logistics_status": t.logistics_status, "payment_status": t.payment_status,
        "stage_index": stage_idx, "stages": STAGES,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _offer_dict(db: Session, o: models.Offer) -> dict:
    lot = db.get(models.Lot, o.lot_id)
    buyer = db.get(models.Buyer, o.buyer_id)
    return {
        "offer_id": o.offer_id, "lot_id": o.lot_id, "buyer_id": o.buyer_id,
        "buyer_name": buyer.name if buyer else None,
        "buyer_type": buyer.buyer_type if buyer else None,
        "crop": lot.crop if lot else None, "grade": lot.grade if lot else None,
        "farmer_id": lot.farmer_id if lot else None,
        "offered_price_per_qtl": o.offered_price_per_qtl,
        "offered_qty_tonnes": o.offered_qty_tonnes,
        "order_value": round(o.offered_price_per_qtl * o.offered_qty_tonnes * 10, 2),
        "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


@router.post("/offers")
def post_offer(body: dict, db: Session = Depends(get_db)):
    offer = models.Offer(
        lot_id=body["lot_id"], buyer_id=body["buyer_id"],
        offered_price_per_qtl=body["offered_price_per_qtl"],
        offered_qty_tonnes=body["offered_qty_tonnes"], status="PENDING")
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return _offer_dict(db, offer)


@router.post("/offers/{offer_id}/accept")
def accept_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = db.get(models.Offer, offer_id)
    if not offer:
        raise HTTPException(404, "Offer not found")
    if offer.status != "PENDING":
        raise HTTPException(400, f"Offer already {offer.status}")
    offer.status = "ACCEPTED"
    # prototype truck-id generator — synthetic, clearly not real dispatch
    truck = f"MH{random.randint(10, 49)}{random.choice('ABCDEHJKLMNPRSTUVWXYZ')}" \
            f"{random.choice('ABCDEHJKLMNPRSTUVWXYZ')}{random.randint(1000, 9999)}"
    txn = models.Transaction(offer_id=offer.offer_id,
                             final_price_per_qtl=offer.offered_price_per_qtl,
                             final_qty_tonnes=offer.offered_qty_tonnes,
                             truck_id=truck, logistics_status="ASSIGNED",
                             payment_status="PENDING")
    db.add(txn)
    lot = db.get(models.Lot, offer.lot_id)
    if lot:
        lot.status = "SOLD"
    db.commit()
    db.refresh(txn)
    return _txn_dict(db, txn)


@router.post("/offers/{offer_id}/reject")
def reject_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = db.get(models.Offer, offer_id)
    if not offer:
        raise HTTPException(404, "Offer not found")
    offer.status = "REJECTED"
    db.commit()
    return _offer_dict(db, offer)


@router.get("/offers/lot/{lot_id}")
def offers_for_lot(lot_id: int, db: Session = Depends(get_db)):
    rows = db.query(models.Offer).filter(models.Offer.lot_id == lot_id)\
        .order_by(models.Offer.created_at.desc()).all()
    return [_offer_dict(db, o) for o in rows]


@router.get("/offers/buyer/{buyer_id}")
def offers_for_buyer(buyer_id: int, db: Session = Depends(get_db)):
    rows = db.query(models.Offer).filter(models.Offer.buyer_id == buyer_id)\
        .order_by(models.Offer.created_at.desc()).all()
    return [_offer_dict(db, o) for o in rows]


@router.get("/offers/farmer/{farmer_id}")
def offers_for_farmer(farmer_id: int, db: Session = Depends(get_db)):
    """Needed so the farmer desk can see + accept incoming offers (demo step 7)."""
    lot_ids = [l.lot_id for l in db.query(models.Lot)
               .filter(models.Lot.farmer_id == farmer_id).all()]
    rows = (db.query(models.Offer).filter(models.Offer.lot_id.in_(lot_ids or [0]))
              .order_by(models.Offer.created_at.desc()).all())
    return [_offer_dict(db, o) for o in rows]


@router.get("/transactions/{txn_id}")
def get_txn(txn_id: int, db: Session = Depends(get_db)):
    t = db.get(models.Transaction, txn_id)
    if not t:
        raise HTTPException(404, "Transaction not found")
    return _txn_dict(db, t)


@router.get("/transactions/farmer/{farmer_id}")
def txns_for_farmer(farmer_id: int, db: Session = Depends(get_db)):
    lot_ids = [l.lot_id for l in db.query(models.Lot)
               .filter(models.Lot.farmer_id == farmer_id).all()]
    offers = db.query(models.Offer).filter(models.Offer.lot_id.in_(lot_ids or [0])).all()
    rows = (db.query(models.Transaction)
              .filter(models.Transaction.offer_id.in_([o.offer_id for o in offers] or [0]))
              .order_by(models.Transaction.created_at.desc()).all())
    return [_txn_dict(db, t) for t in rows]


@router.get("/transactions/buyer/{buyer_id}")
def txns_for_buyer(buyer_id: int, db: Session = Depends(get_db)):
    offers = db.query(models.Offer).filter(models.Offer.buyer_id == buyer_id).all()
    rows = (db.query(models.Transaction)
              .filter(models.Transaction.offer_id.in_([o.offer_id for o in offers] or [0]))
              .order_by(models.Transaction.created_at.desc()).all())
    return [_txn_dict(db, t) for t in rows]


@router.patch("/transactions/{txn_id}/status")
def patch_txn(txn_id: int, body: dict, db: Session = Depends(get_db)):
    """Prototype status stepper advance (no real logistics/payment backend)."""
    t = db.get(models.Transaction, txn_id)
    if not t:
        raise HTTPException(404, "Transaction not found")
    if body.get("logistics_status"):
        if body["logistics_status"] not in ("ASSIGNED", "IN_TRANSIT", "DELIVERED"):
            raise HTTPException(400, "bad logistics_status")
        t.logistics_status = body["logistics_status"]
    if body.get("payment_status"):
        if body["payment_status"] not in ("PENDING", "PARTIAL", "PAID"):
            raise HTTPException(400, "bad payment_status")
        t.payment_status = body["payment_status"]
    db.commit()
    return _txn_dict(db, t)
