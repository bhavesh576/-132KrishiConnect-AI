"""Shared engine context: static reference data (mandis, cost tables) loaded
once per process; per-request price slices loaded for the crop/date window
being evaluated. Keeping engines as pure functions over this context makes
them unit-testable without the DB.
"""
import functools
import json
import os
from datetime import date, timedelta

from database import SessionLocal
import models

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

MANDI_COUNT = 25
GRID_MAX_DAYS = 30  # Section 6.2: day_offset grid 0..30


class StaticCtx:
    """Immutable reference tables + mandi registry (from data/mandis.json)."""

    def __init__(self):
        with open(os.path.join(DATA_DIR, "mandis.json"), encoding="utf-8") as f:
            self.mandis = {m["mandi_id"]: m for m in json.load(f)}
        db = SessionLocal()
        try:
            self.transport = {}
            for r in db.query(models.TransportCost).all():
                self.transport[(r.from_mandi_id, r.to_mandi_id)] = r
            self.storage = {r.crop: r for r in db.query(models.StorageCost).all()}
            self.spoilage = {r.crop: r for r in db.query(models.Spoilage).all()}
            self.grade_adj = {(r.crop, r.grade): r.pct_adjustment
                              for r in db.query(models.GradeAdjustment).all()}
        finally:
            db.close()

    def mandi(self, mandi_id: int) -> dict:
        return self.mandis[mandi_id]

    def crop_list(self):
        return sorted({c for (c, _g) in self.grade_adj})


@functools.lru_cache(maxsize=1)
def static_ctx() -> StaticCtx:
    return StaticCtx()


def load_prices(crop: str, date_from: date, date_to: date) -> dict:
    """-> {(mandi_id, 'YYYY-MM-DD'): modal_price_per_qtl} for one crop window."""
    db = SessionLocal()
    out = {}
    try:
        rows = (db.query(models.MandiPrice.mandi_id, models.MandiPrice.date,
                         models.MandiPrice.modal_price_per_qtl)
                  .filter(models.MandiPrice.crop == crop,
                          models.MandiPrice.date >= date_from.isoformat(),
                          models.MandiPrice.date <= date_to.isoformat())
                  .all())
        for mandi_id, d, price in rows:
            out[(mandi_id, d)] = price
    finally:
        db.close()
    return out


def price_window_for(harvest_date: date, max_days: int = GRID_MAX_DAYS):
    return harvest_date, harvest_date + timedelta(days=max_days + 2)
