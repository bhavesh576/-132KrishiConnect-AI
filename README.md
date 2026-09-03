# KrishiConnect — SIH 2026, PS #26132 (Team Hexamind)
### Complete prototype guide — architecture, design system, page-by-page walkthrough & working internals

Market linkage + price-discovery **prototype** for farmers, built for
Smart India Hackathon 2026 (Govt. of Maharashtra / MSInS).
A decision engine + linkage layer that sits **beside** APMC/e-NAM — not a replacement.

> **Prototype build — prices and buyers are synthetic sample data for
> demonstration. Formulas and logic are real.**
> No live Agmarknet/e-NAM feed, no real payments/UPI, no real SMS, no runtime ML — by design.

---

## Table of contents

1. [What the product does](#1-what-the-product-does)
2. [System architecture](#2-system-architecture)
3. [Design system — how it looks](#3-design-system--how-it-looks)
4. [Page-by-page walkthrough (all 19 screens)](#4-page-by-page-walkthrough)
5. [The six engines — how the numbers work](#5-the-six-engines--how-the-numbers-work)
6. [The golden demo record — exact numbers trace](#6-the-golden-demo-record--exact-numbers-trace)
7. [Database & seed data](#7-database--seed-data)
8. [Authentication & i18n](#8-authentication--i18n)
9. [Running it](#9-running-it)
10. [Honest-use notes](#10-honest-use-notes)

---

## 1. What the product does

KrishiConnect answers **one farmer question**: *"What will I actually take home, when should
I sell, where, and to whom — for MY specific harvest lot?"* — then helps complete that sale.

It is **not** a price dashboard and **not** a chatbot. It is:

1. a **decision engine** — net realisation per mandi/day after transport, storage and spoilage,
   with a transparent SELL_NOW / HOLD / SWITCH_MANDI / PARTIAL_SALE recommendation, and
2. a **linkage layer** — ranked buyers with weighted-criteria scores, buyer requirements with
   greedy lot matching, FPO pooling premium, offers → transactions with a prototype stepper,
   grievances, and an admin impact model.

Core principle ("**human manual way, not fake AI**"): *every* number on screen can be expanded
(“Show full formula”) into the literal line-by-line arithmetic that produced it. Every
recommendation is persisted with its full `breakdown_json` as an audit trail.

---

## 2. System architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER  (React 18 client components)                               │
│  - Next.js 14 App Router (19 routes)                                 │
│  - session JWT + role in localStorage ("kc_session")                 │
│  - language in localStorage ("kc_lang") via LanguageProvider         │
│  - every fetch goes to  /api/…  (same origin, never localhost)       │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ fetch /api/*
┌──────────────────────────────▼───────────────────────────────────────┐
│  NEXT.JS SERVER (:3000)                                              │
│  - rewrites /api/:path*  →  http://127.0.0.1:8000/:path*             │
│    (next.config.mjs; keeps the browser decoupled from the API host,  │
│     works the same locally and behind the preview proxy)             │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTP (JSON, Bearer JWT)
┌──────────────────────────────▼───────────────────────────────────────┐
│  FASTAPI (:8000)  — main.py, 9 routers, 35 endpoints                 │
│  auth_router  lots_router  prices_router  buyers_router              │
│  requirements_router  fpo_router  transactions_router                │
│  grievance_router  admin_router                                      │
│                                                                      │
│  ┌── ENGINES (pure functions — the only place numbers are made) ───┐ │
│  │ net_realisation → sale_window → allocation                      │ │
│  │ buyer_match       demand_pull     fpo_premium                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│         │                        │                                   │
│         ▼                        ▼                                   │
│  engine_context              SQLAlchemy ORM                          │
│  (static tables cached       (models.py — 16 tables)                 │
│   per process + price                                │               │
│   window queries)                                    ▼               │
│                                            SQLite  krishiconnect.db  │
│                                            (60 MB, seeded, committed)│
└──────────────────────────────────────────────────────────────────────┘
```

**Request lifecycle — "Analyze" button pressed:**

1. Browser: `GET /api/lots/1` → lot row (crop, grade, qty, storage flag, cash need…).
2. Browser: `GET /api/recommendation/1`.
3. FastAPI loads a **price window slice** (one crop, harvest_date → +32 days) from SQLite;
   mandi registry + transport/storage/spoilage/grade tables come from `engine_context`
   (cached per process — static reference data).
4. `sale_window.recommend()` grid-searches **25 mandis × 31 days = 775 cells**, calling
   `compute_net()` for each — every cell gets gross/transport/storage/spoilage/net.
5. Rules are applied **in spec order** (no-storage → cash-need → 3% HOLD threshold → default);
   the winning cell, the rule branch taken, best-today, best-future, top-10 and inputs are packed
   into a `breakdown` object.
6. The full breakdown is **written to `recommendations`** (audit trail) and returned.
7. Frontend renders the banner, realisation card, comparison table, allocation card — each with
   its own “Show full formula” expandable built from the same breakdown (no recomputation client-side).

**Determinism:** seed scripts use `numpy.random.seed(26132)`; given the same run date, the
entire panel reproduces byte-identically.

---

## 3. Design system — how it looks

The visual goal: a **purposeful, "Government Digital India" utility** (e-NAM / UMANG /
DigiLocker family) — a working tool, not a startup marketing site.

### 3.1 Layout chrome (identical on every page)

```
┌─────────────────────────────────────────────────────────────┐
│ ▀▀ 3px tricolor strip (saffron │ white │ green) ▀▀          │  ← .tricolor, hard stops
├─────────────────────────────────────────────────────────────┤
│ KrishiConnect   Govt. of Maharashtra Pilot│MSInS   EN हि मराठी │ (Farmer) ⎋ │  ← sticky green bar
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   page content — max-w-7xl (80rem), centered, px-4          │
│   (role tab bar sits directly under the header)             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ⚠ Prototype build — prices and buyer profiles are synthetic │  ← honesty footer, every page
└─────────────────────────────────────────────────────────────┘
```

- **Header (left):** wordmark `KrishiConnect` (bold, 18px) + tagline in 11px muted white.
- **Header (right):** EN/हि/मराठी segmented toggle (active = white bg/green text), role badge
  (bordered chip), logout icon button. Sticky top, z-40.
- **Desk tab bar (SubNav):** rounded-top tabs, active tab = warm paper background + green text;
  per-role items (Farmer: Dashboard · Buyers · Transactions · Prices · Grievance).

### 3.2 Color tokens (Tailwind theme + CSS variables)

| Token | Value | Used for |
|---|---|---|
| `primary` | `#1B5E3A` | header bar, primary buttons, NET row, map “good” markers |
| `primary-dark` | `#123D26` | hover states |
| `secondary` / `warning` | `#C97B24` | HOLD state, amber highlights, pooled segments |
| `accent` / `danger` | `#A8432E` | SWITCH_MANDI, shortfall notices, urgent states |
| `success` | `#3C7A34` | SELL_NOW, paid/accepted chips, in-hand block |
| `bg` | `#FAF6EE` | warm off-white page background (never pure white/gray) |
| `surface` | `#FFFFFF` | cards |
| `borderc` | `#D8CFBC` | warm borders (never cool gray) |
| `textc` / `muted` | `#2A2420` / `#6B6155` | warm charcoal text / secondary text |

Status chips map 1:1 to these tokens (e.g. `LISTED` green-tint, `IN_TRANSIT` amber-tint,
`REJECTED` rust-tint). Grade chips: A = olive, B = amber, C = rust.

### 3.3 Typography, shape, elevation

- **IBM Plex Sans** (UI/headings) + **Noto Sans Devanagari** (HI/MR glyphs) — both
  **self-hosted variable fonts** (`frontend/fonts/`, loaded via `next/font/local`), no CDN.
- Numbers formatted **Indian style** everywhere (`lib/format.ts` → `Intl.NumberFormat("en-IN")`):
  ₹4,694 · ₹2,34,700 — never ₹234,700. Units are always explicit (per quintal / t / km).
- **Radius:** 6 px cards & inputs (`rounded-card`), 4 px buttons (`rounded-btn`) — nothing pill-shaped.
- **Elevation:** 1 px solid border + `0 1px 2px rgba(0,0,0,.06)` only (`kc-card`, `shadow-subtle`).
- Reusable CSS component classes (globals.css): `kc-card`, `kc-btn`, `kc-btn-outline`,
  `kc-btn-danger`, `kc-input`, `kc-label`, `kc-label-bi`, `kc-chip`, `kc-th`, `kc-td`.

### 3.4 Signature UI patterns

| Pattern | Where | What it looks like |
|---|---|---|
| **Decision banner** | analyze page | full-width card with a 6px colored top edge (green / amber / rust / **split green-amber** for PARTIAL), a solid-color chip with the decision, a bold headline, and a plain-language reason |
| **RealisationCard** | analyze page | ledger-style table: `Gross ₹…` → `− Transport ₹…` → `− Storage ₹…` → `− Spoilage ₹…` → **`= NET`** highlighted row → big solid-green **Total in-hand** block; Marathi micro-labels beside every row |
| **FormulaBreakdown** | under every result | `<details>` expandable, monospace line-by-line arithmetic on a warm paper panel with a green left rule |
| **AllocationSplitCard** | analyze page | single stacked horizontal bar (olive sell / amber hold / green pool) with tonnage labels inside segments, legend + one-line sentence summary |
| **BuyerRankedList** | farmer/buyers | cards with match-% in a solid green box top-right, Payment Reliability **as its own field** with a mini progress bar, verified ✔ chip, colored buyer-type chip, per-card match-formula expandable |
| **TransactionStepper** | both transaction pages | 5 horizontal stages (Offer Accepted → Truck Assigned → In Transit → Delivered → Payment Released), checkmarks for done, ring on current, caption "Prototype status stepper" |
| **Illustrative badge** | impact card | amber bordered chip "ⓘ Illustrative / formula-based, not measured" — rendered unconditionally, non-dismissible |

### 3.5 Iconography & bilingual labels

- **Lucide icons only, literal/functional**: Sprout (crops), Handshake (buyer), Users (FPO),
  ShieldCheck (admin), IndianRupee, Truck, Warehouse, Scale, Calendar, MapPin, AlertTriangle,
  Share2, LogOut. Zero decorative icons, zero emoji-as-icon.
- **Bilingual micro-labels on farmer-facing screens**: English label + smaller muted Devanagari
  term under/beside it — बाजार समिती, निव्वळ प्राप्ती, काढणीची तारीख, आता विका / थांबवा,
  एकूण हातात येणारे, etc. (via `kc-label` + `kc-label-bi` pairs).

---

## 4. Page-by-page walkthrough

Every screen below lists: **purpose → layout (positions) → what's interactive → API calls →
what engine/numbers appear.**

### 4.0 `/login` — gateway (no marketing hero)

- **Layout:** centered `max-w-3xl`. Top: one problem-statement line
  ("Strengthening market linkages and price discovery for farmers — SIH 2026, PS #26132").
  Row of **4 plain bordered role cards** (Farmer 🌱 / Buyer / FPO / Admin — Lucide icons),
  2×2 on mobile, 4-across on desktop. Below: **"Just checking? One-click demo login"** panel
  with 4 quick-login buttons (phones shown in monospace).
- **Flow:** click a role card → phone input (`max-w-md` card) → *Send OTP* → OTP box with amber
  **"Demo OTP: 1234"** hint → *Verify & Login* → redirected to that role's desk. The quick-login
  buttons call the **same** verify endpoint with the demo phone + OTP pre-filled.
- **APIs:** `POST /auth/otp/request`, `POST /auth/otp/verify` (issues JWT `{user_id, role}`).

### 4.1 `/farmer/dashboard`

- **Layout:** tab bar → title row (`Ramesh Patil · Dashboard`) with **"+ Add New Harvest Lot"**
  button at top-right → **4 stat cards** (Active lots / Tonnes listed / Open offers /
  Pending grievances — plain bordered, icons) → **Incoming offers** table (only when pending
  offers exist; Accept / Reject buttons per row) → **My Lots** table (crop + Marathi name,
  quantity, grade chip, harvest date, mandi, status chip, **Analyze** button per row).
- **Interactive:** Accept/Reject offers (→ creates/voids transaction path), Analyze → analyze page.
- **APIs:** `GET /lots/farmer/{id}`, `GET /offers/farmer/{id}`, `GET /grievance?farmer_id=`,
  `GET /transactions/farmer/{id}`.

### 4.2 `/farmer/lot/new`

- **Layout:** single centered form card (`max-w-2xl`), one field-group per row with bilingual
  labels: Crop dropdown (12 crops, "Onion · कांदा") → Quantity (t) + Grade A/B/C radio-chip row →
  Harvest date + Current mandi dropdown (25) → Storage Yes/No toggle row → Cash-need checkbox
  (reveals ₹ amount + by-date) → full-width submit.
- **Key detail:** harvest date **defaults to today, computed at render** (`todayStr()`) — the
  spec's known-bug fix. FPO link auto-detected via membership lookup (drives pooling toggle later).
- **APIs:** `GET /prices/mandis`, `GET /fpo/membership/{id}`, `POST /lots` → auto-redirect to analyze.

### 4.3 `/farmer/lot/[id]/analyze` — THE CROWN JEWEL SCREEN

Top-to-bottom:

1. **Lot summary bar** — left: `Onion · 5 t [Grade A]` + meta line (mandi 📍, harvest date 📅,
   quintals ⚖, lot #). Right: **Storage ON/OFF toggle** and **Cash-need toggle** (reveals inline
   amount + date + *Recalculate*) — judges flip these live and the page recomputes. Below an
   internal divider: **FPO Pooling toggle** (when farmer is in an FPO). A small "↻ Recalculate…"
   indicator appears while re-running.
2. **Decision banner** — colored as per state (HOLD=amber, SELL_NOW=green, SWITCH_MANDI=rust,
   PARTIAL_SALE=split). Headline e.g. *"HOLD 5 days — Aurangabad · ₹4,694/quintal"*; reason line
   in plain language; tiny footer note showing `rule branch: RULE_3_HOLD · grid 25×31 · 3% threshold`.
3. **Two-column grid** (stacks on mobile):
   - **Left — RealisationCard:** the ledger (see §3.4) ending in the solid-green
     **Total in-hand ₹2,34,700** block + "Show full formula" expandable that prints the literal
     calculation, e.g. `Gross = ₹4,518.43 × (1 + 8% grade) = ₹4,879.90/qtl`,
     `Storage = ₹4/day × 5 days = ₹20`, `NET = 4,879.90 − 68.31 − 20 − 97.60 = ₹4,694.00/qtl`.
   - **Right — Comparison table** ("Why this option won"): top-5 (mandi, day, net) with the best
     row tinted green and starred **★ BEST** — this is the *why*, visible. Under it the
     **AllocationSplitCard** when PARTIAL or pooling applies: stacked bar
     `2.76t | 2.24t` (or 3-way with pool segment), sentence summary, split-formula expandable.
4. **Action row:** **Create Digital Offer Listing** (sets lot → LISTED, visible to buyers),
   **Share via WhatsApp** (opens `wa.me/?text=<plain-language summary>`, explicitly the allowed
   mechanism — the message itself says "Synthetic demo data — formulas real"),
   **View Ranked Buyers →** (carries lot context).

- **APIs:** `GET /lots/{id}`, `GET /recommendation/{id}`, `GET /allocation/{id}?fpo_pool=true`,
  `PATCH /lots/{id}` (storage/cash/status toggles).

### 4.4 `/farmer/buyers`

- **Layout:** title + lot-context line ("Lot #1: Onion · 5 t · Grade A") → **2-column card grid**.
  Each buyer card: name + ✔ Verified chip · colored **buyer-type chip** (Wholesaler/Processor/
  Institutional/Exporter/Retailer) · **match-% green box top-right** · Payment Reliability
  **`87/100` with bar** (own labelled field) · avg payment days · distance · district ·
  "Show match formula" expandable · **Send Offer** button (prompts price → real POST).
- **Honesty detail:** the displayed `match_pct` **is** the ranking value (single computation,
  sorted server-side; an automated test asserts list order == sort by displayed pct).
- **APIs:** `GET /lots/{id}`, `GET /buyers?lot_id={id}`, `POST /offers`.

### 4.5 `/farmer/transactions`

- **Layout:** table — #, crop, buyer, qty, price ₹/qtl, **Truck ID** (monospace), logistics chip,
  payment chip, ▼ expander. Expanded row: **TransactionStepper** (5 stages) + order value +
  **Advance (demo) →** button (moves the prototype stepper via PATCH; footer explicitly says
  "not a live logistics/UPI integration").
- **APIs:** `GET /transactions/farmer/{id}`, `PATCH /transactions/{id}/status`.

### 4.6 `/farmer/grievance`

- **Layout:** form card (Category dropdown: Payment delay / Quality dispute / Weighing dispute /
  Other · linked-transaction dropdown optional · description textarea · submit) →
  past-grievances table with status chips.
- **APIs:** `POST /grievance`, `GET /grievance?farmer_id=`.

### 4.7 `/farmer/prices`

- **Layout:** controls row — crop dropdown + **25 mandi chips** (multi-select, max 6, active =
  green) → **Recharts line chart** card (90-day modal price ₹/qtl, one colored line per mandi,
  rupee axis, legend) → **Leaflet map** card: Maharashtra, 25 markers **color + size coded by
  current price** (pale-olive low → rust high, quintile scale), hover tooltips with price +
  arrivals, legend swatches + "as of {date}".
- **Honesty label:** "Agmarknet-style synthetic 3-year panel — not a live feed."
- **APIs:** `GET /prices?crop=&mandi=&days=90`, `GET /prices/heatmap?crop=`, `GET /prices/mandis`.
- **Note:** map tiles (OSM) need internet; chart/table work offline.

### 4.8 `/buyer/dashboard`

- **Layout:** 3 stat cards (Open requirements / Active offers sent / Completed transactions) →
  **"Post New Requirement"** button top-right → My Requirements table (#, crop, qty, min grade,
  destination, deadline, status, **Analyze →** link to matches).
- **APIs:** `GET /requirements/buyer/{id}`, `GET /offers/buyer/{id}`, `GET /transactions/buyer/{id}`.

### 4.9 `/buyer/requirements/new`

- **Layout:** centered form — crop, quantity (t), min-grade A/B/C chips, destination district
  dropdown, deadline date (defaults **+48 h**; a formatted "07 Sep 2026"-style preview of the
  chosen date appears under the native input), submit → straight to matches.
- **APIs:** `POST /requirements`.

### 4.10 `/buyer/requirements/[id]/matches` — second most important screen

- **Layout:** requirement summary line → **progress card**: bold `Matched: 8.6 / 10 t`, progress
  bar (green when full, amber when partial) and — when supply doesn't cover it — a **rust-colored
  bordered notice: "Shortfall: 1.4 tonnes — no further supply currently available"** (the honest
  no-fake-100%-match moment) → matches table: Farmer/FPO name (+ lot link), **source chip**
  (FARMER / FPO_POOL), matched tonnes, distance, grade, per-row **Send Offer**; bulk
  **"Send Offer to All Matched Lots"** top-right.
- **Engine:** `demand_pull` greedy matcher — nearest LISTED lots first (grade DESC tiebreak),
  then FPO pooled lots, shortfall reported, matches persisted to `requirement_matches`.
- **APIs:** `GET /requirements/{id}/matches`, `POST /offers`.

### 4.11 `/buyer/offers` · `/buyer/transactions`

- Offers: sent-offers table with Pending/Accepted/Rejected chips.
- Transactions: same stepper pattern as the farmer view, buyer's rows.

### 4.12 `/fpo/dashboard`

- **Layout:** FPO identity header (name, member count, district, contact) → **Members table**
  (name, village, district, active lots, total tonnes contributed — computed live from member
  lots, with an always-visible caption "(N mapped in prototype DB)" honestly disclosing that
  only 3 members are wired to real lot data vs the stated 320) → **"Open Buyer Requirements
  Available to Pool"** table (buyer, type, crop, qty, grade, destination, deadline).
- **APIs:** `GET /fpo/{id}/members`, `GET /requirements/open`.

### 4.13 `/fpo/pool-simulator`

- **Layout:** two cards side by side. Left: tonnes **number input + range slider (0–60)** +
  Recalculate + a note printing the config constants (base 2 %, +1 %/5 t, cap 15 %).
  Right: results — **premium %** (big, amber) and **pooled net price** (big, green), weighted-avg
  note, and the stepped formula expandable **open by default**:
  `premium = min(15%, 2% + floor(22/5)×1% = 2% + 4×1% = 6%)`.
- **APIs:** `POST /fpo/{id}/pool-simulate` (computes weighted avg of member lots' best-today
  nets, then applies 6.6).

### 4.14 `/admin/dashboard`

- **Layout:** 4 stat cards (Registered farmers 500 / buyers 300 / Active FPOs 150 / Total lots) →
  **Coverage** section: Leaflet map with district markers **sized by farmer count** + tooltips
  (buyers/FPOs/lots per district) + district table (top 16) → **Modelled Impact** card:
  title + **non-dismissible amber "ⓘ Illustrative / formula-based, not measured" badge**,
  adoption number input + slider (1,000 → 1,00,000), solid-green projected annual benefit block,
  formula expandable: `projected = adoption × 2.5 lots/farmer/yr × avg uplift % × avg lot value`.
- **APIs:** `GET /admin/coverage`, `GET /admin/impact-model?adoption=`.

### 4.15 `/admin/grievances` · `/admin/impact`

- Grievances: status filter dropdown + all-farmers grievance table with **inline status-change
  dropdowns** (Open → In Review → Resolved; caption "Simulated resolution — status field update only").
- Impact: dedicated full-width page for the same impact card (formula expandable open by default).

---

## 5. The six engines — how the numbers work

All six live in `backend/engines/` as **pure functions** (testable without the DB; routers only
wire them to HTTP). Units: quantities in **tonnes** internally, per-unit prices in **₹/quintal**
(1 t = 10 qtl; conversion at engine edges).

| # | Engine | Formula (implemented literally) | Constants (all commented config) |
|---|--------|--------------------------------|----------------------------------|
| 6.1 | `net_realisation.compute_net` | `gross = modal × (1 + grade%)`; `transport = fixed_loading + km × ₹/qtl/km`; `storage = ₹/day × days (0 on day 0)`; `spoilage = gross × %/day × grade_mult × days`; `net = gross − transport − storage − spoilage`. Returns the **full dict** every time. | — |
| 6.2 | `sale_window.recommend` | Grid 25 mandis × day 0–30 → rules **in order**: ① no storage → SELL_NOW (local) / SWITCH_MANDI, **never HOLD**; ② cash need → PARTIAL_SALE if `cash/net < lot qty` else full SELL_NOW; ③ `best_future > best_today × 1.03` → HOLD; ④ else SELL_NOW | `HOLD_THRESHOLD_PCT = 3.0`, grid 0–30 |
| 6.3 | `allocation.allocate` | `sell_now = min(cash/net, qty)`; `remaining`; if FPO pool and `remaining > 1 t`: `pool = remaining × 0.4`, `hold = rest` | `FPO_MIN_POOL_THRESHOLD_T = 1.0`, `POOL_SHARE = 0.4` |
| 6.4 | `buyer_match.score_buyer` | `raw = 0.30·crop + 0.15·qty_fit + 0.20·quality + 0.15·dist + 0.20·payment`; `match_pct = round(raw×100)` — **displayed value IS the ranking value** | weights fixed by spec, `MAX_DISTANCE_KM = 400` |
| 6.5 | `demand_pull.match_requirement` | Greedy (explicitly non-ML): nearest LISTED lots with grade ≥ required, fill to quantity; then FPO **POOLED** lots; return matches + **shortfall** | — |
| 6.6 | `fpo_premium.compute_premium` | `premium = min(15%, 2% + floor(t/5)×1%)`; `pooled_net = weighted_avg(member nets) × (1 + premium)` | `BASE=2.0, STEP_T=5, STEP_INC=1.0, MAX=15.0` |

Every API response for realisation/recommendation/allocation/match embeds a `breakdown` object
with **every intermediate number**, and `POST`-side results persist to
`recommendations.breakdown_json` / `requirement_matches` for auditability.

---

## 6. The golden demo record — exact numbers trace

Pre-seeded lot **#1**: Onion · 5 t (50 qtl) · Grade A · harvested on the seed-run date ·
current mandi Nashik (#3) · storage ON · FPO-linked · LISTED.

| Demo action | Engine result (real values) |
|---|---|
| Analyze (storage ON) | **HOLD 5 days @ Aurangabad** — modal ₹4,518.43 → gross **₹4,879.90** → − transport **₹68.31** (loading + 114.4 km) → − storage **₹20.00** (₹4/day × 5) → − spoilage **₹97.60** (0.4%/day × A-mult × 5 × gross) → **NET ₹4,694.00/qtl** → **Total in-hand ₹2,34,700** |
| Storage OFF toggle | **SWITCH_MANDI** → Lasalgaon, **₹2,898.55/qtl** today (Nashik day-0 is ₹2,850 — rule 1 forces sell today, best mandi wins) |
| Cash need ₹80,000 | **PARTIAL_SALE** — required = 80,000 ÷ 2,898.55 = **27.6 qtl = 2.76 t** sell now, **2.24 t** hold |
| FPO pooling ON | 3-way split **2.76 / 1.344 / 0.896 t** (pool = 2.24 × 40 %) |
| Buyer 10 t Gr-A Onion → Pune | nearest LISTED lots matched 7.2 t (0.7 + 1.5 + 5.0) + **1.4 t FPO_POOL** row = 8.6 t, honest **shortfall 1.4 t** |
| Offer ₹2,800/qtl accepted | Transaction created, truck `MH15CY3768`-style ID, stepper at TRUCK_ASSIGNED → advance to IN_TRANSIT |

`run_all_seed.py` **verifies all of this automatically** after every seed and fails loudly if
anything drifts. Re-run the seed on demo morning so the golden window anchors to that day.

---

## 7. Database & seed data

**16 SQLAlchemy tables** (`models.py`): reference — `mandi_prices` (420,600 rows:
25 mandis × 12 crops × 1,402 days, Jan 2023 → seed-day + 60), `transport_cost_table` (625 pairs,
haversine distances, ₹0.15–0.25/qtl/km + ₹20–40 loading), `storage_cost_table` (₹2–8/qtl/day,
max-safe-days per crop), `spoilage_table` (Onion 0.4 %/day … Wheat ~0; grade mult A/B/C = 1.0/1.3/1.6),
`grade_price_adjustment` (A +8 %, B 0, C −12); transactional — `farmers` (500), `buyers` (300,
5 types), `fpos` (150), `fpo_members` (440), `lots`, `recommendations` (audit rows),
`buyer_requirements`, `requirement_matches`, `offers`, `transactions`, `grievances`
(1 realistic sample row seeded — Ramesh Patil, Quality dispute — so the Admin desk is
non-empty on a fresh seed), `admins`.

**Price model:** crop base price × seasonal sinusoid + mean-reverting random walk + occasional
volatility spikes (Onion weighted up for the Nashik-belt story), clipped to sane bounds —
deterministic under `numpy.random.seed(26132)`.

**Golden overlay:** around the seed-run date, Onion modal curves at Lasalgaon / Nashik /
Aurangabad are solved **from the target nets via the exact engine formula** (keyframed,
piecewise-linear, blended back into the walk at the edges) so §6 reproduces every time —
hand-tuned per the spec's Section 4, disclosed in the build report (§7 D1–D2, §8 item 2).

**Seed exports** (`backend/data/`): `mandi_prices.csv` (28 MB), `farmers/buyers/fpos/
fpo_members` CSVs, cost-table CSVs, `mandis.json`, `demo_accounts.json`.

---

## 8. Authentication & i18n

**Auth (demo-safe):** phone + OTP; OTP is **always `1234`** (hardcoded in `auth.py`, loudly
commented "DEMO ONLY — not real OTP"; no SMS is dispatched). On verify, the backend issues a
JWT `{user_id, role}` (HS256, 24 h). The frontend stores it in `localStorage` and attaches
`Authorization: Bearer …` to every request (`lib/api.ts`). **RoleGuard** wraps each desk's
routes and redirects to `/login` on missing/mismatched role. The login page additionally offers
the **one-click demo login** panel — same real verify endpoint, pre-filled demo accounts.

**i18n:** three full JSON dictionaries (`i18n/en.json`, `hi.json`, `mr.json`) loaded statically
into a React context (`LanguageProvider`), mounted **once at the root layout** so the choice
never resets on navigation. The top-bar switch applies **instantly without reload** and
persists (`kc_lang`, storage access hardened with try/catch). Coverage is **complete across
all four desks** — every UI string goes through the dictionary, and a coverage validator
scans all `t("key")` references in the codebase against all three languages (179 keys ×
EN/HI/MR, all present). Includes statuses, crop names, the 4 recommendation types, grade
labels, formula/breakdown terms, Marathi micro-labels on farmer screens, and the honesty
notes (map tiles, stepper, simulated resolution). One known caveat: on a *hard* full-page
reload there is a one-frame English flash before the saved language applies (client-side
i18n without SSR cookies) — navigation itself never resets the language.

---

## 9. Running it

```bash
# Backend (Python 3.11+; tested on 3.13)
cd backend
pip install -r requirements.txt
python -m seed.run_all_seed        # optional: rebuild + self-verify DB (~10 s)
uvicorn main:app --reload          # :8000 — Swagger UI at /docs

# Frontend (Node 18+)
cd ../frontend
npm install
npm run dev                        # :3000 — /api/* proxied to :8000
```

**Logins** (OTP `1234`; or use the one-click panel on `/login`):

| Role | Phone | Account |
|------|-------|---------|
| Farmer | **9876543210** | Ramesh Patil, Nashik (golden account) |
| Buyer | 9822011111 | Shree Ganesh Trading Co. (Wholesaler) |
| Buyer | 9822022222 | Mahagrapes Exports LLP (Exporter) |
| FPO | 9822033333 | Nashik Drushkava Kanda Utpadak FPO Ltd |
| Admin | 9999999999 | KrishiConnect Admin (MSInS) |

Production build verified: `npm run build` (21 routes, clean tsc).
Gotcha: restart the backend after reseeding (per-process reference cache).

### Deploying to Render

A Render Blueprint is included: **`render.yaml`** deploys two free services —
**krishiconnect-api** (FastAPI; re-seeds SQLite at every boot so the golden
demo window always anchors to "today") and **krishiconnect-web** (Next.js
production build, pointed at the API via the `NEXT_PUBLIC_API_URL` env var).
Push this folder to GitHub → Render → *New + → Blueprint* → paste the API URL
when prompted. Full instructions and free-tier caveats (cold starts, ephemeral
disk, UTC timezone note) are in **`DEPLOY_RENDER.md`**. Local development is
unchanged — with `NEXT_PUBLIC_API_URL` unset the frontend uses the `/api`
proxy as always.

---

## 10. Honest-use notes

- Say **"Agmarknet-style synthetic 3-year panel"**, "weighted criteria — transparent",
  "prototype status stepper", "modelled impact (formula-based, illustrative)" — the UI copy
  already enforces this; keep it that way in decks too.
- The golden price window is **hand-tuned by design** (spec §4) and disclosed in the build
  report; everything outside that window is the pure statistical panel.
- Map tiles (OpenStreetMap) need internet; every other feature is fully offline.
- Full reviewer documentation — checklist, deviations (D1–D13), mocked elements, demo results,
  design self-audit — lives in **`docs/PROTOTYPE_BUILD_REPORT.md`**.
