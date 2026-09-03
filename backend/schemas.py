"""Pydantic request/response models (Section 7 contract)."""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date


class OTPRequest(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    otp: str


class LotCreate(BaseModel):
    farmer_id: int
    crop: str
    quantity_tonnes: float
    grade: str
    harvest_date: date
    storage_available: bool = False
    cash_need_amount: Optional[float] = None
    cash_need_by_date: Optional[date] = None
    current_location_mandi_id: int
    fpo_id: Optional[int] = None


class LotPatch(BaseModel):
    storage_available: Optional[bool] = None
    cash_need_amount: Optional[float] = None
    cash_need_by_date: Optional[date] = None
    status: Optional[str] = None
    quantity_tonnes: Optional[float] = None
    grade: Optional[str] = None


class RequirementCreate(BaseModel):
    buyer_id: int
    crop: str
    quantity_tonnes: float
    grade: str
    destination_district: str
    deadline_date: date


class OfferCreate(BaseModel):
    lot_id: int
    buyer_id: int
    offered_price_per_qtl: float
    offered_qty_tonnes: float


class TxnStatusPatch(BaseModel):
    logistics_status: Optional[str] = None
    payment_status: Optional[str] = None


class GrievanceCreate(BaseModel):
    farmer_id: int
    category: str
    description: str
    txn_id: Optional[int] = None


class GrievancePatch(BaseModel):
    status: str


class PoolSimulate(BaseModel):
    tonnes: float
