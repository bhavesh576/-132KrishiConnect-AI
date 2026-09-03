"""SQLAlchemy models — schema per SIH build spec Section 5 (EXACT).

Reference/static tables are loaded from seed CSVs in backend/data/.
`mandi_prices` is deliberately denormalised (mandi_name/district/lat/lon
repeated per row) exactly as the spec's schema defines it.
"""
from sqlalchemy import (Column, Integer, String, Float, Boolean, Date,
                        DateTime, ForeignKey, UniqueConstraint)
from sqlalchemy.sql import func
from database import Base


# ---------------- static / reference tables ----------------
class MandiPrice(Base):
    __tablename__ = "mandi_prices"
    id = Column(Integer, primary_key=True, index=True)
    mandi_id = Column(Integer, index=True)
    mandi_name = Column(String)
    district = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    crop = Column(String, index=True)
    date = Column(String, index=True)  # ISO YYYY-MM-DD
    grade = Column(String)             # 'B' = base modal price (grade adj applied at compute time)
    modal_price_per_qtl = Column(Float)
    arrival_qty_tonnes = Column(Float)


class TransportCost(Base):
    __tablename__ = "transport_cost_table"
    from_mandi_id = Column(Integer, primary_key=True)
    to_mandi_id = Column(Integer, primary_key=True)
    distance_km = Column(Float)
    cost_per_qtl_per_km = Column(Float)
    fixed_loading_cost = Column(Float)


class StorageCost(Base):
    __tablename__ = "storage_cost_table"
    crop = Column(String, primary_key=True)
    cost_per_qtl_per_day = Column(Float)
    max_safe_storage_days = Column(Integer)


class Spoilage(Base):
    __tablename__ = "spoilage_table"
    crop = Column(String, primary_key=True)
    spoilage_pct_per_day = Column(Float)
    grade_multiplier = Column(Float)  # A=1.0, B=1.3, C=1.6


class GradeAdjustment(Base):
    __tablename__ = "grade_price_adjustment"
    crop = Column(String, primary_key=True)
    grade = Column(String, primary_key=True)  # A / B / C
    pct_adjustment = Column(Float)            # +8 / 0 / -12


# ---------------- transactional tables ----------------
class Farmer(Base):
    __tablename__ = "farmers"
    farmer_id = Column(Integer, primary_key=True)
    name = Column(String)
    phone = Column(String, index=True)
    village = Column(String)
    district = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    language_pref = Column(String, default="en")


class Buyer(Base):
    __tablename__ = "buyers"
    buyer_id = Column(Integer, primary_key=True)
    name = Column(String)
    buyer_type = Column(String)  # Wholesaler/Processor/Institutional Buyer/Exporter/Retailer
    district = Column(String)
    # phone is not in the Section 5 column list but Section 9 requires buyer
    # demo accounts to log in via phone + OTP — necessary addition (noted in
    # the build report).
    phone = Column(String, index=True)
    verified_flag = Column(Boolean, default=True)
    payment_reliability_score = Column(Float)  # 0-100
    avg_payment_days = Column(Integer)
    # Needed by the Section 6.4 match formula (interested crop / typical lot
    # size / minimum acceptable grade). Not in the Section 5 column list —
    # added because the formula literally references them. Documented in the
    # build report as a deviation.
    interested_crop = Column(String)
    typical_need_tonnes = Column(Float)
    min_grade = Column(String, default="C")


class FPO(Base):
    __tablename__ = "fpos"
    fpo_id = Column(Integer, primary_key=True)
    name = Column(String)
    district = Column(String)
    member_count = Column(Integer)
    contact = Column(String)


class FPOMember(Base):
    __tablename__ = "fpo_members"
    id = Column(Integer, primary_key=True)
    fpo_id = Column(Integer, ForeignKey("fpos.fpo_id"), index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.farmer_id"), index=True)


class Lot(Base):
    __tablename__ = "lots"
    lot_id = Column(Integer, primary_key=True)
    farmer_id = Column(Integer, ForeignKey("farmers.farmer_id"), index=True)
    fpo_id = Column(Integer, ForeignKey("fpos.fpo_id"), nullable=True)
    crop = Column(String)
    quantity_tonnes = Column(Float)
    grade = Column(String)  # A / B / C
    harvest_date = Column(Date)
    storage_available = Column(Boolean, default=False)
    cash_need_amount = Column(Float, nullable=True)
    cash_need_by_date = Column(Date, nullable=True)
    current_location_mandi_id = Column(Integer)
    status = Column(String, default="DRAFT")  # DRAFT / LISTED / POOLED / SOLD
    created_at = Column(DateTime, server_default=func.now())


class Recommendation(Base):
    __tablename__ = "recommendations"
    rec_id = Column(Integer, primary_key=True)
    lot_id = Column(Integer, ForeignKey("lots.lot_id"), index=True)
    recommendation_type = Column(String)  # SELL_NOW / HOLD / SWITCH_MANDI / PARTIAL_SALE
    best_mandi_id = Column(Integer)
    best_day_offset = Column(Integer)
    net_price_per_qtl = Column(Float)
    breakdown_json = Column(String)  # FULL audit trail — every intermediate number
    sell_now_tonnes = Column(Float, nullable=True)
    hold_tonnes = Column(Float, nullable=True)
    pool_fpo_tonnes = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class BuyerRequirement(Base):
    __tablename__ = "buyer_requirements"
    req_id = Column(Integer, primary_key=True)
    buyer_id = Column(Integer, ForeignKey("buyers.buyer_id"), index=True)
    crop = Column(String)
    quantity_tonnes = Column(Float)
    grade = Column(String)
    destination_district = Column(String)
    deadline_date = Column(Date)
    status = Column(String, default="OPEN")  # OPEN / FULFILLED / CLOSED
    created_at = Column(DateTime, server_default=func.now())


class RequirementMatch(Base):
    __tablename__ = "requirement_matches"
    id = Column(Integer, primary_key=True)
    req_id = Column(Integer, ForeignKey("buyer_requirements.req_id"), index=True)
    lot_id = Column(Integer, ForeignKey("lots.lot_id"))
    matched_tonnes = Column(Float)
    source_type = Column(String)  # FARMER / FPO_POOL


class Offer(Base):
    __tablename__ = "offers"
    offer_id = Column(Integer, primary_key=True)
    lot_id = Column(Integer, ForeignKey("lots.lot_id"), index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.buyer_id"), index=True)
    offered_price_per_qtl = Column(Float)
    offered_qty_tonnes = Column(Float)
    status = Column(String, default="PENDING")  # PENDING / ACCEPTED / REJECTED
    created_at = Column(DateTime, server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"
    txn_id = Column(Integer, primary_key=True)
    offer_id = Column(Integer, ForeignKey("offers.offer_id"))
    final_price_per_qtl = Column(Float)
    final_qty_tonnes = Column(Float)
    truck_id = Column(String)
    logistics_status = Column(String, default="ASSIGNED")  # ASSIGNED / IN_TRANSIT / DELIVERED
    payment_status = Column(String, default="PENDING")     # PENDING / PARTIAL / PAID
    created_at = Column(DateTime, server_default=func.now())


class Grievance(Base):
    __tablename__ = "grievances"
    grievance_id = Column(Integer, primary_key=True)
    txn_id = Column(Integer, ForeignKey("transactions.txn_id"), nullable=True)
    farmer_id = Column(Integer, ForeignKey("farmers.farmer_id"), index=True)
    category = Column(String)
    description = Column(String)
    status = Column(String, default="OPEN")  # OPEN / IN_REVIEW / RESOLVED
    created_at = Column(DateTime, server_default=func.now())


class Admin(Base):
    """Not in the Section 5 column list — minimal addition so the Admin role
    has a loginable demo account (Section 9 requires one)."""
    __tablename__ = "admins"
    admin_id = Column(Integer, primary_key=True)
    name = Column(String)
    phone = Column(String, index=True)
