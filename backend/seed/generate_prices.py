"""Price panel generation + DEMO GOLDEN RECORD hand-tuning.

Panel: daily modal price (₹/qtl) for 25 mandis × 12 crops, Jan 2023 →
seed-run date + 60 days (extended past the spec's "~mid 2026" end so that
lots created on the demo day — with harvest date = today — always have
data, including the 30-day forward grid; documented in the build report).

Deterministic: numpy.random.seed(26132) and a fixed iteration order, so the
same run date always reproduces identical data.

GOLDEN RECORD (Section 4): an Onion lot, Grade A, harvested at Nashik ON THE
SEED-RUN DATE (demo date), storage ON must yield:
  - HOLD 5 days, sell at Aurangabad, net ≈ ₹4,694 /qtl
  - storage OFF  -> SWITCH_MANDI (best today = Lasalgaon, net ₹80,000/27.6qtl)
  - cash need ₹80,000 -> PARTIAL_SALE 2.76 t sell now / 2.24 t hold
The Onion curve for Lasalgaon/Nashik/Aurangabad around the demo date is
hand-tuned by SOLVING the modal price from the target net via the exact
engine formula (no magic at runtime — the engine stays literal).
"""
import os
from datetime import date, timedelta

import numpy as np
import pandas as pd

from . import cost_tables
from database import Base, engine, SessionLocal
import models

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

PANEL_START = date(2023, 1, 1)
DEMO_DATE = date.today()                 # demo anchor = seed-run date
PANEL_END = DEMO_DATE + timedelta(days=60)

# crop -> (base ₹/qtl, seasonal amplitude, phase, daily walk sigma, arr_lo, arr_hi)
CROP_PARAMS = {
    "Onion":        (1500, 0.22, 0.0, 0.012, 200, 2500),
    "Tomato":       (1200, 0.25, 1.1, 0.014, 50, 600),
    "Potato":       (1100, 0.15, 2.0, 0.007, 100, 800),
    "Soybean":      (4500, 0.10, 0.6, 0.005, 50, 400),
    "Cotton":       (6800, 0.08, 1.8, 0.004, 50, 300),
    "Wheat":        (2600, 0.10, 0.9, 0.004, 100, 600),
    "Grapes":       (5500, 0.15, 1.4, 0.008, 30, 250),
    "Pomegranate":  (6500, 0.12, 2.2, 0.006, 20, 150),
    "Banana":       (1800, 0.12, 0.3, 0.007, 50, 400),
    "Sugarcane":    (3100, 0.06, 2.6, 0.003, 100, 500),
    "Gram (Chana)": (5200, 0.09, 1.0, 0.004, 50, 300),
    "Maize":        (2100, 0.10, 1.6, 0.005, 50, 400),
}

# ------------------------- GOLDEN RECORD CONSTANTS -------------------------
GOLDEN_HOLD_NET = 4694.0                 # target net ₹/qtl (Aurangabad, day 5)
GOLDEN_TODAY_NET = 80000.0 / 27.6        # → required qty exactly 27.6 qtl = 2.76 t
GOLDEN_LOCAL_NET = 2850.0                # Nashik day-0 net (below Lasalgaon)
ID_LASALGAON, ID_NASHIK, ID_AURANGABAD = 1, 3, 10
ONION_SPOIL_PER_DAY = cost_tables.SPOILAGE["Onion"][0] / 100.0
ONION_GRADE_FACTOR_A = 1.08              # Grade A +8%

# modal-price keyframes (₹/qtl) around demo date, per special mandi
KEYFRAMES = {
    ID_AURANGABAD: {-4: 2450, -2: 2500, -1: 2600, 0: 2650, 1: 2900, 2: 3300,
                    3: 3800, 4: 4200, 6: 4200, 7: 3800, 8: 3300, 9: 2900,
                    10: 2750, 12: 2650, 15: 2400},
    ID_LASALGAON:  {-3: 2400, -2: 2500, -1: 2600, 0: None,  # solved = GOLDEN_TODAY_NET
                    1: 2600, 2: 2500, 3: 2400, 5: 2250},
    ID_NASHIK:     {-3: 2350, -2: 2450, -1: 2550, 0: None,  # solved = GOLDEN_LOCAL_NET
                    1: 2550, 2: 2450, 3: 2350, 5: 2200},
}
CAP_FUTURE_MODAL = 4300.0   # any onion modal day 1..30 → net stays < HOLD target
CAP_TODAY_MODAL = 2600.0    # non-special mandi day-0 → net < Lasalgaon day-0
# ---------------------------------------------------------------------------


def solve_modal(target_net, transport, storage, days):
    """Invert the engine formula: net = g − t − s − g·spoil·days, g = m×1.08."""
    factor = ONION_GRADE_FACTOR_A * (1 - ONION_SPOIL_PER_DAY * days)
    return round((target_net + transport + storage) / factor, 2)


def golden_transports():
    t = cost_tables.transport_rows()
    def pair(f, to):
        r = next(x for x in t if x["from_mandi_id"] == f and x["to_mandi_id"] == to)
        return r["fixed_loading_cost"] + r["distance_km"] * r["cost_per_qtl_per_km"]
    return pair(ID_NASHIK, ID_AURANGABAD), pair(ID_NASHIK, ID_LASALGAON), pair(ID_NASHIK, ID_NASHIK)


def keyframe_values():
    t_aur, t_las, t_nas = golden_transports()
    kf = {mid: dict(kv) for mid, kv in KEYFRAMES.items()}
    kf[ID_AURANGABAD][5] = solve_modal(GOLDEN_HOLD_NET, t_aur,
                                       cost_tables.STORAGE["Onion"][0] * 5, 5)
    kf[ID_LASALGAON][0] = solve_modal(GOLDEN_TODAY_NET, t_las, 0, 0)
    kf[ID_NASHIK][0] = solve_modal(GOLDEN_LOCAL_NET, t_nas, 0, 0)
    return kf


def apply_keyframes(modal, kf: dict, offsets):
    """Piecewise-linear interpolation of keyframes over the raw walk values.
    Near the edges of the keyframe range the value blends back into the raw
    random-walk curve so the panel has no artificial cliffs."""
    ks = sorted(kf)
    lo, hi = ks[0], ks[-1]
    out = modal.copy()
    for idx, off in enumerate(offsets):
        if off < lo or off > hi:
            continue
        if off in kf:
            out[idx] = kf[off]
        else:
            left = max(k for k in ks if k <= off)
            right = min(k for k in ks if k >= off)
            if right == left:
                continue
            w = (off - left) / (right - left)
            interp = kf[left] * (1 - w) + kf[right] * w
            edge = min(abs(off - lo), abs(off - hi))
            blend = min(1.0, edge / 4.0)
            out[idx] = interp * (1 - blend) + modal[idx] * blend
    return out


KEYFRAME_VALUES = None  # (kept for reference; keyframes computed per run in apply_golden_overlay)


def generate_panel():
    np.random.seed(26132)  # fixed spec seed
    dates = pd.date_range(PANEL_START, PANEL_END, freq="D")
    n = len(dates)
    day_of_year = dates.dayofyear.to_numpy()
    frames = []
    for crop, (base, amp, phase, sigma, arr_lo, arr_hi) in CROP_PARAMS.items():
        for mid, (mname, district, lat, lon) in enumerate(cost_tables.MANDIS, start=1):
            mandi_factor = 0.92 + ((mid * 37 + len(crop) * 11) % 17) / 100.0  # 0.92–1.08
            anchor = np.log(base * mandi_factor * (1 + amp * np.sin(2 * np.pi * (day_of_year - 30) / 365.0 + phase)))
            eps = np.random.normal(0, sigma, n)
            logp = np.empty(n)
            logp[0] = anchor[0]
            theta = 0.012
            for i in range(1, n):
                logp[i] = logp[i - 1] + theta * (anchor[i] - logp[i - 1]) + eps[i]
            price = np.exp(logp)
            # occasional volatility spikes (mainly Onion — Nashik belt story)
            spike_p = 0.006 if crop == "Onion" else 0.002
            spikes = np.random.rand(n) < spike_p
            for idx in np.where(spikes)[0]:
                dur = min(int(np.random.randint(4, 9)), n - idx)
                if dur <= 0:
                    continue
                mag = np.random.uniform(1.25, 1.8) if crop == "Onion" else np.random.uniform(1.15, 1.4)
                ramp = np.sin(np.linspace(0, np.pi, dur))
                price[idx:idx + dur] *= (1 + (mag - 1) * ramp)
            price = np.clip(price, base * 0.45, base * 3.2)
            arrival = (np.random.uniform(arr_lo, arr_hi, n)
                       * mandi_factor * (0.7 + 0.6 * np.abs(np.sin(2 * np.pi * (day_of_year - 30) / 365.0 + phase))))
            frames.append(pd.DataFrame({
                "mandi_id": mid, "mandi_name": mname, "district": district,
                "lat": lat, "lon": lon, "crop": crop,
                "date": dates.strftime("%Y-%m-%d").to_numpy(),
                "grade": "B",  # base modal (B = 0% grade adjustment baseline)
                "modal_price_per_qtl": np.round(price, 2),
                "arrival_qty_tonnes": np.round(arrival, 1),
            }))
    df = pd.concat(frames, ignore_index=True)
    return df


def apply_golden_overlay(df: pd.DataFrame) -> pd.DataFrame:
    """Hand-tune the Onion curve around DEMO_DATE so the golden record holds."""
    kf_by_mandi = keyframe_values()
    df = df.copy()
    df["date_dt"] = pd.to_datetime(df["date"])
    demo_ts = pd.Timestamp(DEMO_DATE)
    df["offset"] = (df["date_dt"] - demo_ts).dt.days

    onion = df["crop"] == "Onion"
    in_window = df["offset"].between(-6, 30)

    # caps for non-special mandis (guarantee best-today / best-future winners)
    mask_caps = onion & in_window & ~df["mandi_id"].isin(KEYFRAMES.keys())
    df.loc[mask_caps & (df["offset"] >= 1), "modal_price_per_qtl"] = \
        df.loc[mask_caps & (df["offset"] >= 1), "modal_price_per_qtl"].clip(upper=CAP_FUTURE_MODAL)
    df.loc[mask_caps & (df["offset"] == 0), "modal_price_per_qtl"] = \
        df.loc[mask_caps & (df["offset"] == 0), "modal_price_per_qtl"].clip(upper=CAP_TODAY_MODAL)

    # keyframe curves for Lasalgaon / Nashik / Aurangabad
    for mid in KEYFRAMES:
        mask = onion & (df["mandi_id"] == mid) & df["offset"].between(-6, 20)
        sub = df.loc[mask].sort_values("offset")
        if sub.empty:
            continue
        tuned = apply_keyframes(sub["modal_price_per_qtl"].to_numpy(),
                                kf_by_mandi[mid], sub["offset"].to_numpy())
        df.loc[sub.index, "modal_price_per_qtl"] = np.round(tuned, 2)

    df.drop(columns=["date_dt", "offset"], inplace=True)
    return df


def main():
    Base.metadata.create_all(engine)
    df = generate_panel()
    df = apply_golden_overlay(df)
    csv_path = os.path.join(DATA_DIR, "mandi_prices.csv")
    df.to_csv(csv_path, index=False)
    print(f"[generate_prices] wrote {csv_path}: {len(df):,} rows "
          f"({PANEL_START} → {PANEL_END}, DEMO_DATE={DEMO_DATE})")

    db = SessionLocal()
    try:
        db.query(models.MandiPrice).delete()
        db.commit()
        df.to_sql("mandi_prices", engine, if_exists="append", index=False, chunksize=10000)
        n = db.query(models.MandiPrice).count()
        print(f"[generate_prices] mandi_prices rows in DB: {n:,}")
    finally:
        db.close()

    # mandis.json for the engine context / API (mandi registry)
    mandis = [{"mandi_id": i + 1, "mandi_name": m, "district": d, "lat": la, "lon": lo}
              for i, (m, d, la, lo) in enumerate(cost_tables.MANDIS)]
    import json
    with open(os.path.join(DATA_DIR, "mandis.json"), "w", encoding="utf-8") as f:
        json.dump(mandis, f, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
