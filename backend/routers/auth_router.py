from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from auth import DEMO_OTP, create_token
from database import get_db
from schemas import OTPRequest, OTPVerify

router = APIRouter(prefix="/auth", tags=["auth"])


def _resolve(db: Session, phone: str):
    f = db.query(models.Farmer).filter(models.Farmer.phone == phone).first()
    if f:
        return f.farmer_id, "FARMER", f.name
    b = db.query(models.Buyer).filter(models.Buyer.phone == phone).first()
    if b:
        return b.buyer_id, "BUYER", b.name
    o = db.query(models.FPO).filter(models.FPO.contact == phone).first()
    if o:
        return o.fpo_id, "FPO", o.name
    a = db.query(models.Admin).filter(models.Admin.phone == phone).first()
    if a:
        return a.admin_id, "ADMIN", a.name
    return None, None, None


@router.post("/otp/request")
def request_otp(body: OTPRequest, db: Session = Depends(get_db)):
    uid, role, name = _resolve(db, body.phone)
    # DEMO ONLY — not real OTP. No SMS is sent; OTP is always "1234".
    return {"sent": True, "registered": role is not None, "role": role,
            "name": name, "demo_otp_hint": DEMO_OTP}


@router.post("/otp/verify")
def verify_otp(body: OTPVerify, db: Session = Depends(get_db)):
    # DEMO ONLY — not real OTP verification.
    if body.otp != DEMO_OTP:
        raise HTTPException(401, "Invalid OTP (demo OTP is 1234)")
    uid, role, name = _resolve(db, body.phone)
    if role is None:
        raise HTTPException(404, "Phone not registered in demo registry")
    return {"jwt": create_token(uid, role), "role": role, "user_id": uid, "name": name}
