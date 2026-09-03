"""Cost tables: transport (haversine mandi-pairs), storage, spoilage, grade adj.

Transport rates: pair-level cost_per_qtl_per_km in ₹0.15–0.25 and fixed
loading in ₹20–40/qtl. NOTE: the spec's Section 5 schema for
transport_cost_table has NO crop column, so per-crop bulkiness variation is
not representable there — rates vary by pair instead. Documented in the
build report. All values are DETERMINISTIC (pure functions of ids), so
generate_prices.py can recompute the same numbers when hand-tuning the
golden record.
"""
import math
import os
from datetime import datetime

import pandas as pd
from sqlalchemy import text

import models
from database import Base, engine, SessionLocal

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

# (name, district, lat, lon) — real Maharashtra APMC mandis, approx coordinates
MANDIS = [
    ("Lasalgaon", "Nashik", 20.1467, 74.3233),
    ("Pimpalgaon Baswant", "Nashik", 20.0500, 73.8667),
    ("Nashik", "Nashik", 19.9975, 73.7898),
    ("Manmad", "Nashik", 20.2525, 74.4489),
    ("Yeola", "Nashik", 20.2833, 74.4833),
    ("Kalvan", "Nashik", 20.4400, 74.1500),
    ("Umrane", "Nashik", 20.5500, 74.0500),
    ("Vaijapur", "Aurangabad", 19.9200, 74.7700),
    ("Chandwad", "Nashik", 20.3300, 74.2500),
    ("Aurangabad", "Aurangabad", 19.8776, 75.3360),
    ("Pune (Market Yard)", "Pune", 18.4857, 73.8675),
    ("Solapur", "Solapur", 17.6599, 75.9064),
    ("Ahmednagar", "Ahmednagar", 19.0948, 74.7480),
    ("Satara", "Satara", 17.6868, 74.0200),
    ("Sangli", "Sangli", 16.8524, 74.5815),
    ("Kolhapur", "Kolhapur", 16.7050, 74.2433),
    ("Nagpur", "Nagpur", 21.1458, 79.0882),
    ("Jalna", "Jalna", 19.8410, 75.8810),
    ("Latur", "Latur", 18.4028, 76.5600),
    ("Nanded", "Nanded", 19.1383, 77.3210),
    ("Akola", "Akola", 20.7002, 77.0082),
    ("Amravati", "Amravati", 20.9374, 77.7796),
    ("Dhule", "Dhule", 20.9042, 74.7749),
    ("Jalgaon", "Jalgaon", 21.0077, 75.5626),
    ("Baramati", "Pune", 18.1514, 74.5777),
]

CROPS = ["Onion", "Tomato", "Potato", "Soybean", "Cotton", "Wheat",
         "Grapes", "Pomegranate", "Banana", "Sugarcane", "Gram (Chana)", "Maize"]

# Perishability-driven tables (spec: Onion ~0.4%/day; Grapes/Tomato 1-1.5%;
# Wheat/Gram ~0). Grade multiplier A=1.0, B=1.3, C=1.6 per spec.
SPOILAGE = {  # crop -> (pct/day, grade_multiplier)
    "Onion": (0.40, 1.0), "Tomato": (1.20, 1.0), "Potato": (0.15, 1.0),
    "Soybean": (0.05, 1.0), "Cotton": (0.05, 1.0), "Wheat": (0.01, 1.0),
    "Grapes": (1.30, 1.0), "Pomegranate": (0.90, 1.0), "Banana": (1.10, 1.0),
    "Sugarcane": (0.20, 1.0), "Gram (Chana)": (0.02, 1.0), "Maize": (0.08, 1.0),
}
STORAGE = {  # crop -> (₹/qtl/day, max safe storage days)
    "Onion": (4.0, 60), "Tomato": (7.0, 7), "Potato": (3.0, 90),
    "Soybean": (2.5, 120), "Cotton": (2.0, 150), "Wheat": (2.0, 180),
    "Grapes": (6.0, 21), "Pomegranate": (6.0, 30), "Banana": (6.5, 10),
    "Sugarcane": (2.5, 15), "Gram (Chana)": (2.0, 180), "Maize": (2.5, 120),
}
GRADE_ADJ = {"A": 8.0, "B": 0.0, "C": -12.0}  # % applied to modal price


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def pair_rate(from_id: int, to_id: int) -> float:
    """₹0.15–0.25 /qtl/km — deterministic per pair."""
    return round(0.15 + ((from_id * 7 + to_id * 13) % 11) / 100.0, 2)


def pair_loading(from_id: int, to_id: int) -> float:
    """₹20–40 /qtl fixed loading — deterministic per pair."""
    return 20 + ((from_id * 31 + to_id * 17) % 21)


def transport_rows():
    rows = []
    for i, (_, _, lat1, lon1) in enumerate(MANDIS, start=1):
        for j, (_, _, lat2, lon2) in enumerate(MANDIS, start=1):
            dist = 0.0 if i == j else haversine_km(lat1, lon1, lat2, lon2)
            rows.append({
                "from_mandi_id": i, "to_mandi_id": j,
                "distance_km": round(dist, 1),
                "cost_per_qtl_per_km": pair_rate(i, j),
                "fixed_loading_cost": pair_loading(i, j),
            })
    return rows


def main():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        db.query(models.TransportCost).delete()
        db.query(models.StorageCost).delete()
        db.query(models.Spoilage).delete()
        db.query(models.GradeAdjustment).delete()

        tdf = pd.DataFrame(transport_rows())
        db.bulk_insert_mappings(models.TransportCost, tdf.to_dict("records"))

        sdf = pd.DataFrame(
            [{"crop": c, "cost_per_qtl_per_day": v[0], "max_safe_storage_days": v[1]}
             for c, v in STORAGE.items()])
        db.bulk_insert_mappings(models.StorageCost, sdf.to_dict("records"))

        pdf = pd.DataFrame(
            [{"crop": c, "spoilage_pct_per_day": v[0], "grade_multiplier": v[1]}
             for c, v in SPOILAGE.items()])
        db.bulk_insert_mappings(models.Spoilage, pdf.to_dict("records"))

        gdf = pd.DataFrame(
            [{"crop": c, "grade": g, "pct_adjustment": adj}
             for c in CROPS for g, adj in GRADE_ADJ.items()])
        db.bulk_insert_mappings(models.GradeAdjustment, gdf.to_dict("records"))
        db.commit()

        tdf.to_csv(os.path.join(DATA_DIR, "transport_cost_table.csv"), index=False)
        sdf.to_csv(os.path.join(DATA_DIR, "storage_cost_table.csv"), index=False)
        pdf.to_csv(os.path.join(DATA_DIR, "spoilage_table.csv"), index=False)
        gdf.to_csv(os.path.join(DATA_DIR, "grade_price_adjustment.csv"), index=False)
        print(f"[cost_tables] transport pairs: {len(tdf)}, storage: {len(sdf)}, "
              f"spoilage: {len(pdf)}, grade adj: {len(gdf)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
