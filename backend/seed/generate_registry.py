"""Registry seed: 500 farmers, 300 buyers, 150 FPOs, FPO membership, the
DEMO GOLDEN RECORD accounts + lots, and two open buyer requirements so the
FPO desk is not empty before the demo.

Deterministic: np.random.seed(26132). Faker is used for extra phone/name
variety pools; core names are curated Marathi/Hindi lists for realism.
"""
import json
import os
from datetime import date, timedelta

import numpy as np
import pandas as pd

from . import cost_tables
from database import Base, engine, SessionLocal
import models

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

FIRST = ["Ramesh", "Sanjay", "Vilas", "Prakash", "Sunil", "Dnyaneshwar", "Balasaheb",
         "Shankar", "Gorakh", "Machhindra", "Nanasaheb", "Kailas", "Dipak", "Sachin",
         "Rohit", "Vijay", "Dattatray", "Eknath", "Ganesh", "Sopan", "Tukaram",
         "Bhaskar", "Madhukar", "Ashok", "Pandurang", "Shekhar", "Nitin", "Mangesh",
         "Rangnath", "Somnath", "Sunita", "Vandana", "Shobha", "Manisha", "Rekha",
         "Ramkrishna", "Shyam", "Mohan", "Rameshwar", "Devendra", "Hiralal", "Omprakash"]
SURNAME = ["Patil", "Deshmukh", "Jadhav", "Pawar", "Shinde", "More", "Nikam", "Bagul",
           "Wagh", "Salunkhe", "Gaikwad", "Kale", "Kadam", "Bhosale", "Thorat", "Chavan",
           "Sable", "Gholap", "Khairnar", "Wable", "Sonawane", "Deore", "Bhoir", "Mhaske",
           "Khade", "Aher", "Kshirsagar", "Bhalerao", "Dhage", "Wankhede", "Meshram",
           "Ingle", "Rathod", "Chaudhari", "Tiwari", "Sharma"]
VILLAGES = ["Dindori", "Ozar", "Niphad", "Pimpalgaon", "Sinnar", "Chandwad", "Yeola",
            "Kalwan", "Supa", "Kurkumbh", "Pargaon", "Nanaj", "Tempale", "Rahuri",
            "Shrirampur", "Karad", "Ashta", "Vathar", "Kavathe", "Miraj", "Hatkanangale",
            "Kagal", "Kalmeshwar", "Kamptee", "Badnapur", "Partur", "Nilanga", "Ausa",
            "Deglur", "Biloli", "Patur", "Barshitakli", "Chandur", "Sakri", "Chopda",
            "Erandol", "Indapur", "Baramati", "Wadgaon", "Shikrapur"]
LANGS = {"Nashik": "mr", "Pune": "mr", "Nagpur": "hi", "Amravati": "hi", "Akola": "hi",
         "Jalgaon": "hi", "Dhule": "mr", "Aurangabad": "mr", "Jalna": "mr"}

DISTRICT_PRIMARY_MANDI = {}
for i, (m, d, la, lo) in enumerate(cost_tables.MANDIS, start=1):
    DISTRICT_PRIMARY_MANDI.setdefault(d, i)

BUYER_TYPES = ["Wholesaler", "Processor", "Institutional Buyer", "Exporter", "Retailer"]
NEED_RANGE = {"Wholesaler": (2, 15), "Processor": (10, 60), "Institutional Buyer": (5, 25),
              "Exporter": (10, 50), "Retailer": (0.5, 2)}
PREFIX = ["Shree", "M/s", "Sai", "Balaji", "Ganesh", "Om", "Jai", "Aditya", "Samarth",
          "Siddhivinayak", "Vighnaharta", "Mauli", "Tuljabhavani", "Khandoba", "Bhagyalakshmi"]
ENTITY = {"Wholesaler": "Trading Co.", "Processor": "Agro Processing Pvt Ltd",
          "Institutional Buyer": "Agro Industries", "Exporter": "Exports LLP",
          "Retailer": "Traders"}


def demo_date():
    from .generate_prices import DEMO_DATE
    return DEMO_DATE


def main():
    np.random.seed(26132)
    dd = demo_date()
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        for m in (models.Farmer, models.Buyer, models.FPO, models.FPOMember,
                  models.Lot, models.BuyerRequirement, models.Offer,
                  models.Transaction, models.Grievance, models.Admin,
                  models.Recommendation, models.RequirementMatch):
            db.query(m).delete()
        db.commit()

        # ---------------- farmers (500) ----------------
        districts = list(DISTRICT_PRIMARY_MANDI.keys())
        # weight more farmers to the Nashik/Pune onion belt for demo density
        weights = np.array([3.0 if d in ("Nashik", "Pune") else 1.0 for d in districts])
        weights /= weights.sum()
        fdist = np.random.choice(districts, 499, p=weights)
        farmers = [{
            "farmer_id": 1, "name": "Ramesh Patil", "phone": "9876543210",
            "village": "Dindori", "district": "Nashik",
            "lat": 20.07, "lon": 73.85, "language_pref": "mr",
        }]
        for i, d in enumerate(fdist, start=2):
            mid = DISTRICT_PRIMARY_MANDI[d]
            m = cost_tables.MANDIS[mid - 1]
            farmers.append({
                "farmer_id": i,
                "name": f"{np.random.choice(FIRST)} {np.random.choice(SURNAME)}",
                "phone": f"9{np.random.randint(100000000, 999999999)}",
                "village": str(np.random.choice(VILLAGES)),
                "district": d,
                "lat": round(m[2] + np.random.uniform(-0.15, 0.15), 4),
                "lon": round(m[3] + np.random.uniform(-0.15, 0.15), 4),
                "language_pref": LANGS.get(d, "mr"),
            })
        fdf = pd.DataFrame(farmers)
        db.bulk_insert_mappings(models.Farmer, fdf.to_dict("records"))

        # ---------------- buyers (300) ----------------
        buyers = [{
            "buyer_id": 1, "name": "Shree Ganesh Trading Co.", "buyer_type": "Wholesaler",
            "district": "Pune", "verified_flag": True, "payment_reliability_score": 91,
            "avg_payment_days": 7, "interested_crop": "Onion", "typical_need_tonnes": 12.0,
            "min_grade": "B", "phone": "9822011111",
        }, {
            "buyer_id": 2, "name": "Mahagrapes Exports LLP", "buyer_type": "Exporter",
            "district": "Nashik", "verified_flag": True, "payment_reliability_score": 94,
            "avg_payment_days": 12, "interested_crop": "Grapes", "typical_need_tonnes": 25.0,
            "min_grade": "A", "phone": "9822022222",
        }]
        for i in range(3, 301):
            btype = BUYER_TYPES[(i - 1) % 5]
            d = str(np.random.choice(districts))
            lo, hi = NEED_RANGE[btype]
            buyers.append({
                "buyer_id": i,
                "name": f"{np.random.choice(PREFIX)} {np.random.choice(SURNAME)} {ENTITY[btype]}",
                "buyer_type": btype, "district": d,
                "verified_flag": bool(np.random.rand() < 0.92),
                "payment_reliability_score": int(np.clip(35 + np.random.beta(6, 1.5) * 65, 35, 100)),
                "avg_payment_days": int(np.random.randint(1, 31)),
                "interested_crop": str(np.random.choice(cost_tables.CROPS)),
                "typical_need_tonnes": round(np.random.uniform(lo, hi), 1),
                "min_grade": str(np.random.choice(["A", "B", "C"], p=[0.25, 0.6, 0.15])),
            })
        bdf = pd.DataFrame(buyers)
        db.bulk_insert_mappings(models.Buyer, bdf.to_dict("records"))

        # ---------------- FPOs (150) + membership ----------------
        fpos = [{
            "fpo_id": 1, "name": "Nashik Drushkava Kanda Utpadak FPO Ltd",
            "district": "Nashik", "member_count": 320, "contact": "9822033333",
        }]
        for i in range(2, 151):
            d = str(np.random.choice(districts))
            fpos.append({
                "fpo_id": i,
                "name": f"{d} {np.random.choice(['Shetkari', 'Krishi', 'Bagayat', 'Utpadak', 'Kisan'])} FPO Ltd",
                "district": d, "member_count": int(np.random.randint(30, 401)),
                "contact": f"98{np.random.randint(10000000, 99999999)}",
            })
        db.bulk_insert_mappings(models.FPO, pd.DataFrame(fpos).to_dict("records"))

        members = [{"fpo_id": 1, "farmer_id": 1}]  # Ramesh Patil ∈ demo FPO
        independent = set(np.random.choice(range(2, 501), 60, replace=False))
        fpo_cycle, pos = 1, 0
        for fid in range(2, 501):
            if fid in independent:
                continue
            fpo_cycle = 1 + (fid % 150)
            members.append({"fpo_id": fpo_cycle, "farmer_id": fid})
        db.bulk_insert_mappings(models.FPOMember, members)

        # ---------------- GOLDEN RECORD lots + demo support lots ----------------
        lot1 = models.Lot(  # GOLDEN: Onion 5t A Nashik storage ON (demo step 2-5)
            farmer_id=1, fpo_id=1, crop="Onion", quantity_tonnes=5.0, grade="A",
            harvest_date=dd, storage_available=True, cash_need_amount=None,
            cash_need_by_date=None, current_location_mandi_id=3, status="LISTED")
        pune_f = next(f for f in farmers if f["district"] == "Pune" and f["farmer_id"] != 1)
        lot2 = models.Lot(  # small Pune lot so requirement matching has nearer supply
            farmer_id=pune_f["farmer_id"], fpo_id=None, crop="Onion", quantity_tonnes=0.7,
            grade="A", harvest_date=dd, storage_available=False, cash_need_amount=None,
            cash_need_by_date=None, current_location_mandi_id=11, status="LISTED")
        lot3 = models.Lot(  # Baramati lot
            farmer_id=next(f["farmer_id"] for f in farmers[1:] if f["district"] == "Pune"
                           and f["farmer_id"] != pune_f["farmer_id"] and f["farmer_id"] != 1),
            fpo_id=None, crop="Onion", quantity_tonnes=1.5, grade="A",
            harvest_date=dd, storage_available=True, cash_need_amount=None,
            cash_need_by_date=None, current_location_mandi_id=25, status="LISTED")
        lot4 = models.Lot(  # FPO pooled inventory (FPO_POOL source in demand_pull)
            farmer_id=1, fpo_id=1, crop="Onion", quantity_tonnes=1.4, grade="A",
            harvest_date=dd, storage_available=True, cash_need_amount=None,
            cash_need_by_date=None, current_location_mandi_id=3, status="POOLED")
        lot5 = models.Lot(  # Ramesh extra: tomato, no storage (dashboard variety)
            farmer_id=1, fpo_id=1, crop="Tomato", quantity_tonnes=2.0, grade="B",
            harvest_date=dd, storage_available=False, cash_need_amount=None,
            cash_need_by_date=None, current_location_mandi_id=3, status="DRAFT")
        lot6 = models.Lot(  # Ramesh extra: wheat (dashboard variety)
            farmer_id=1, fpo_id=1, crop="Wheat", quantity_tonnes=4.0, grade="A",
            harvest_date=dd - timedelta(days=5), storage_available=True,
            cash_need_amount=None, cash_need_by_date=None,
            current_location_mandi_id=3, status="DRAFT")
        db.add_all([lot1, lot2, lot3, lot4, lot5, lot6])
        db.commit()

        # two OPEN requirements so the FPO desk has content pre-demo
        db.add_all([
            models.BuyerRequirement(buyer_id=2, crop="Grapes", quantity_tonnes=8.0,
                                    grade="B", destination_district="Nashik",
                                    deadline_date=dd + timedelta(days=6), status="OPEN"),
            models.BuyerRequirement(buyer_id=1, crop="Tomato", quantity_tonnes=12.0,
                                    grade="B", destination_district="Pune",
                                    deadline_date=dd + timedelta(days=4), status="OPEN"),
        ])

        # one realistic sample grievance so the Admin desk is non-empty and no
        # stray test values can appear in a fresh demo (Bug fix: was "c")
        db.add(models.Grievance(
            farmer_id=1, txn_id=None, category="Quality dispute",
            description=("Buyer weighed 4.8t instead of the agreed 5t — "
                         "dispute on final settlement amount."),
            status="OPEN"))

        db.add(models.Admin(admin_id=1, name="KrishiConnect Admin (MSInS)", phone="9999999999"))
        db.commit()

        # ---------------- CSV/JSON exports ----------------
        fdf.to_csv(os.path.join(DATA_DIR, "farmers.csv"), index=False)
        bdf.to_csv(os.path.join(DATA_DIR, "buyers.csv"), index=False)
        pd.DataFrame(fpos).to_csv(os.path.join(DATA_DIR, "fpos.csv"), index=False)
        pd.DataFrame(members).to_csv(os.path.join(DATA_DIR, "fpo_members.csv"), index=False)
        with open(os.path.join(DATA_DIR, "demo_accounts.json"), "w", encoding="utf-8") as f:
            json.dump({
                "farmer": {"phone": "9876543210", "name": "Ramesh Patil", "district": "Nashik"},
                "buyers": [
                    {"phone": "9822011111", "name": "Shree Ganesh Trading Co.", "type": "Wholesaler"},
                    {"phone": "9822022222", "name": "Mahagrapes Exports LLP", "type": "Exporter"}],
                "fpo": {"phone": "9822033333", "name": "Nashik Drushkava Kanda Utpadak FPO Ltd"},
                "admin": {"phone": "9999999999", "name": "KrishiConnect Admin (MSInS)"},
                "otp": "1234 (DEMO ONLY, hardcoded in auth.py)",
                "golden_lot_id": lot1.lot_id,
            }, f, indent=1)

        print(f"[generate_registry] farmers={len(farmers)} buyers={len(buyers)} "
              f"fpos={len(fpos)} fpo_members={len(members)} golden_lot_id={lot1.lot_id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
