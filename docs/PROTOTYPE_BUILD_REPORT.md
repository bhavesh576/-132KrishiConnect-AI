# KrishiConnect — PROTOTYPE BUILD REPORT
**Team Hexamind | Smart India Hackathon 2026 | PS #26132 (Govt. of Maharashtra / MSInS)**

Date of build: 2026-09-03. This report is written for a reviewer who has **not** seen the code.
It is the single artifact used to judge the build against the frozen master spec.

---

## 1. BUILD STATUS SUMMARY

**~100% of the Section 8 page list is built and wired end-to-end to the real API (no mock JSON in components).** All 19 specified routes exist (21 counting the root redirect and the separate `/admin/impact` page the tree implies), all 6 engines are implemented as pure functions exactly per Section 6 formulas, and the Section 12 demo script passes **all 9 steps live against a freshly seeded database, executed through the frontend's own API proxy** (browser → Next.js → FastAPI → SQLite). The one fully-working-but-incomplete surface is polish-level: language coverage is exhaustive on farmer-facing screens and the shared chrome, while a handful of deep admin/buyer micro-labels remain English-only (Section 10 acceptance bar — "at least all farmer-facing screens" — is met). No page is missing; no page is partially fake.

---

## 2. SECTION-BY-SECTION CHECKLIST (from Section 14)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | SQLite seeded at correct scale, reproducible via one script | ✅ | `python -m seed.run_all_seed` → 420,600 price rows (25×12×1,402 days, Jan 2023 → seed-day+60), 500 farmers, 300 buyers, 150 FPOs, 440 FPO memberships, 25×25 transport pairs. Prints counts + verifies golden record, exits non-zero on any assert failure. |
| 2 | All 6 engines as pure functions matching Section 6 exactly | ✅ | See §5 for the pasted core code. Literal formula implementation; constants commented. |
| 3 | All Section 7 API endpoints exist and return breakdown data | ✅ | 35 endpoints (see §6). Every realisation/recommendation/allocation/match response carries a `breakdown` object. |
| 4 | All Section 8 pages exist, wired to real API | ✅ | 19/19 routes; all data fetched from FastAPI; zero hardcoded result numbers in components. |
| 5 | Demo script runs start to finish without manual DB edits | ✅ | Verified on a fresh reseed through the frontend proxy — see §9. |
| 6 | Design matches Section 1 (no forbidden patterns) | ✅ | Self-audit in §10. |
| 7 | Honesty labels on every relevant screen | ✅ | Persistent footer on every page (root layout); "Illustrative" badge non-dismissible on impact card; stepper labelled "Prototype status stepper"; prices page labelled "Agmarknet-style synthetic 3-year panel — not a live feed"; WhatsApp share text itself says "Synthetic demo data — formulas real". |
| 8 | i18n EN/HI/MR on all farmer-facing screens | ✅ (⚠️ beyond farmer desk) | Full dictionaries (en/hi/mr JSON) + instant switch + localStorage persistence. Farmer screens fully covered (nav, labels, banners, statuses, crops, breakdown terms, bilingual micro-labels). Some deep buyer/FPO/admin table micro-copy remains English. |
| 9 | Harvest-date bug fixed (defaults to today) | ✅ | `LotForm.tsx`: `useState(todayStr())` — computed at render, never hardcoded. |
| 10 | match_pct display bug fixed (display = ranking score) | ✅ | `buyer_match.py` computes `match_pct = round(raw*100)` **once**; ranking sorts by the same `_raw`; the card renders exactly that value; API test asserts list order == sorted by match_pct. |
| 11 | Payment reliability visible as its own field on buyer cards | ✅ | "Payment Reliability: 87/100" + small bar, per card. |
| 12 | Buyer-type tags on buyer directory/cards | ✅ | Colored chip per type (Wholesaler/Processor/Institutional Buyer/Exporter/Retailer). |

---

## 3. ACTUAL FILE TREE (what exists, pruned of `node_modules`/`.next`/`__pycache__`)

```
krishiconnect/
├── README.md
├── docs/
│   └── PROTOTYPE_BUILD_REPORT.md          ← this file
├── backend/
│   ├── main.py                            FastAPI app (9 routers)
│   ├── database.py                        SQLite + SQLAlchemy session
│   ├── models.py                          ALL Section 5 tables
│   ├── schemas.py                         Pydantic request models
│   ├── auth.py                            JWT + DEMO OTP "1234" (loudly commented)
│   ├── requirements.txt
│   ├── krishiconnect.db                   60 MB, seeded & committed
│   ├── seed/
│   │   ├── cost_tables.py                 transport (625 pairs, haversine) / storage / spoilage / grade
│   │   ├── generate_prices.py             panel + GOLDEN RECORD hand-tuning
│   │   ├── generate_registry.py           500/300/150 registry + golden accounts/lots
│   │   └── run_all_seed.py                orchestrator + golden-record verification
│   ├── engines/
│   │   ├── engine_context.py              shared static ctx + price-window loader
│   │   ├── net_realisation.py             6.1
│   │   ├── sale_window.py                 6.2
│   │   ├── allocation.py                  6.3
│   │   ├── buyer_match.py                 6.4
│   │   ├── demand_pull.py                 6.5
│   │   └── fpo_premium.py                 6.6
│   ├── routers/
│   │   ├── auth_router.py  lots_router.py  prices_router.py  buyers_router.py
│   │   ├── requirements_router.py  fpo_router.py  transactions_router.py
│   │   └── grievance_router.py  admin_router.py
│   └── data/
│       ├── mandi_prices.csv (28 MB)  mandis.json  demo_accounts.json
│       ├── transport_cost_table.csv  storage_cost_table.csv
│       └── spoilage_table.csv  grade_price_adjustment.csv
│       └── farmers.csv  buyers.csv  fpos.csv  fpo_members.csv
└── frontend/
    ├── package.json  tailwind.config.ts  next.config.mjs  .eslintrc.json
    ├── fonts/  IBMPlexSans.ttf  NotoSansDevanagari.ttf   (self-hosted variable fonts)
    ├── i18n/  en.json  hi.json  mr.json
    ├── lib/   api.ts  auth.ts  format.ts (₹ Indian formatting)
    ├── components/
    │   ├── layout/    TopBar  LanguageSwitch  RoleGuard  SubNav  FooterDisclaimer
    │   ├── i18n/      LanguageProvider
    │   ├── farmer/    RealisationCard  DecisionCard  AllocationSplitCard  LotForm  BuyerRankedList
    │   ├── buyer/     (matches table inline in matches page; forms in pages)
    │   ├── fpo/       MemberList  PoolSimulatorForm
    │   ├── admin/     CoverageStats  ImpactModelCard  GrievanceTable
    │   └── shared/    FormulaBreakdown  PriceChart  MapView + MapPanel  GrievanceForm
    │                  TransactionStepper  StatCard  StatusChip
    └── app/
        ├── layout.tsx (tricolor strip + green TopBar + footer disclaimer)
        ├── page.tsx (redirect /login)   login/page.tsx
        ├── farmer/ dashboard  lot/new  lot/[id]/analyze  buyers  transactions  grievance  prices
        ├── buyer/  dashboard  requirements/new  requirements/[id]/matches  offers  transactions
        ├── fpo/    dashboard  pool-simulator  requirements
        └── admin/  dashboard  grievances  impact
```

Component note: buyer-side `RequirementForm/MatchTable/OfferCard` logic lives inside the corresponding pages (they are single-use); farmer/admin/fpo/spec-named components exist as separate files exactly as the tree requires. `components/buyer/*` is the one directory not split out — deviation noted in §7.

---

## 4. HOW TO RUN

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m seed.run_all_seed       # optional: rebuild DB from scratch (~10 s, self-verifying)
uvicorn main:app --reload         # API on :8000, Swagger UI at /docs

# Frontend
cd ../frontend
npm install
npm run dev                       # Web on :3000; /api/* is proxied to :8000 (see next.config.mjs)
```

**Demo credentials (OTP = `1234` for every account, DEMO ONLY):**

| Role   | Phone | Account |
|--------|-------|---------|
| Farmer | **9876543210** | Ramesh Patil, Nashik — golden account |
| Buyer  | 9822011111 | Shree Ganesh Trading Co. — Wholesaler, Pune |
| Buyer  | 9822022222 | Mahagrapes Exports LLP — Exporter, Nashik |
| FPO    | 9822033333 | Nashik Drushkava Kanda Utpadak FPO Ltd |
| Admin  | 9999999999 | KrishiConnect Admin (MSInS) |

**Pre-seeded golden lot:** lot id **1** — Onion · 5 t · Grade A · harvested on the seed-run date · Nashik · storage ON · LISTED. Analyze page → **HOLD 5 days @ Aurangabad, net ₹4,694.00/qtl**. **Re-run `python -m seed.run_all_seed` on the morning of the demo** so the golden price window anchors to that day (see §7, deviation D1).

Production build verified: `npm run build` compiles all 21 routes cleanly (tsc + eslint with `no-explicit-any` relaxed for prototype code).

---

## 5. ENGINE VERIFICATION (actual core calculation code)

### 5.1 net_realisation.py (6.1) — the one formula every number traces back to
```python
key = (mandi["mandi_id"], (lot["harvest_date"] + timedelta(days=day_offset)).isoformat())
modal = prices.get(key)
if modal is None: return None

pct_adj   = sctx.grade_adj.get((lot["crop"], lot["grade"]), 0.0)
gross     = modal * (1 + pct_adj / 100.0)                       # modal × (1 + grade adj)
tc        = sctx.transport[(lot["current_mandi_id"], mandi["mandi_id"])]
transport = tc.fixed_loading_cost + tc.distance_km * tc.cost_per_qtl_per_km
sc        = sctx.storage[lot["crop"]]
storage   = 0 if day_offset == 0 else sc.cost_per_qtl_per_day * day_offset
sp        = sctx.spoilage[lot["crop"]]
spoilage  = gross * (sp.spoilage_pct_per_day / 100.0) * sp.grade_multiplier * day_offset
net       = gross - transport - storage - spoilage
return {mandi, day, modal, grade_adj, gross, transport(+distance), storage, spoilage, net}
# full dict ALWAYS returned/stored — never `net` alone
```

### 5.2 sale_window.py (6.2) — grid 25 mandis × day 0..30, rules in exact order
```python
if not lot["storage_available"]:                                  # RULE 1 — never HOLD
    if best_today["mandi_id"] == lot["current_mandi_id"]: → SELL_NOW
    else:                                                 → SWITCH_MANDI(best_today)
elif lot.get("cash_need_amount"):                                 # RULE 2
    required_qty_qtl = lot["cash_need_amount"] / best_today["net_per_qtl"]
    → PARTIAL_SALE(sell_now=required, hold=rest) if required < qty_qtl else SELL_NOW
elif best_future["net_per_qtl"] > best_today["net_per_qtl"] * 1.03:  # RULE 3 (3% const)
    → HOLD(best_future.mandi, best_future.day_offset)
else:                                                             # RULE 4
    → SELL_NOW
```

### 5.3 allocation.py (6.3) — constants named & commented (`FPO_MIN_POOL_THRESHOLD_T=1.0`, `POOL_SHARE=0.4`)
```python
sell_now  = min(cash_need / best_today_net, qty_qtl) / 10 if cash_need else 0.0
remaining = quantity_tonnes - sell_now
if fpo_pool_available and remaining > FPO_MIN_POOL_THRESHOLD_T:
    pool_fpo = remaining * POOL_SHARE;  hold = remaining - pool_fpo
else: pool_fpo = 0.0; hold = remaining
```

### 5.4 buyer_match.py (6.4) — one score, used for BOTH ranking and display (bug-proof by construction)
```python
raw = 0.30*crop_match + 0.15*qty_fit + 0.20*quality_match + 0.15*distance_score + 0.20*payment_score
match_pct = round(raw * 100)          # SINGLE source of truth for display AND ranking
ranked.sort(key=lambda x: x["_raw"], reverse=True)
```

### 5.5 demand_pull.py (6.5) — explicitly non-ML greedy matcher
```python
farmer_candidates = sorted((l for l in LISTED_lots if l.crop==req.crop
                            and grade_rank(l.grade) >= grade_rank(req.grade)),
                           key=lambda l: (dist_to_destination(l), -grade_rank(l.grade)))
greedy-fill to req.quantity → source_type "FARMER"
if shortfall: repeat over POOLED lots → source_type "FPO_POOL"
return matches, shortfall                    # shortfall reported honestly, never faked
```

### 5.6 fpo_premium.py (6.6) — `BASE_PREMIUM_PCT=2.0, STEP_TONNES=5, STEP_INCREMENT_PCT=1.0, MAX_PREMIUM_PCT=15.0` (all commented as config)
```python
premium_pct = min(MAX_PREMIUM_PCT, BASE_PREMIUM_PCT + int(pooled_tonnes // STEP_TONNES) * STEP_INCREMENT_PCT)
pooled_net  = weighted_avg(member lot nets, weight=qty) * (1 + premium_pct/100)
```

**Golden-record self-verification output (real, from `run_all_seed.py`):**
```
[golden] storage ON : HOLD          -> Aurangabad   day 5  net ₹4,694.00/qtl  (RULE_3_HOLD)
[golden] storage OFF: SWITCH_MANDI  -> Lasalgaon    day 0  net ₹2,898.55/qtl  (RULE_1_NO_STORAGE_SWITCH)
[golden] cash ₹80,000: PARTIAL_SALE (RULE_2_CASH_NEED_PARTIAL)
[golden] allocation  : sell_now 2.76 t · hold 2.24 t · pool 0.0 t
[golden] + FPO pool : sell 2.76 t · hold 1.344 t · pool 0.896 t
```

---

## 6. API ENDPOINT LIST (actual, 35 routes)

Section 7 list: **all present.** Additions and the reason for each:

| Endpoint | Note |
|---|---|
| POST /auth/otp/request · POST /auth/otp/verify | per spec; OTP always `1234` |
| POST /lots · GET /lots/farmer/{id} · GET /lots/{id} | per spec |
| **PATCH /lots/{id}** | **added** — required for the live storage/cash toggles & "Create Digital Offer Listing" (demo steps 2–6) |
| GET /realisation/{id} · GET /recommendation/{id} · GET /allocation/{id}?fpo_pool= | per spec; recommendation persists full `breakdown_json` audit row every call |
| GET /prices · GET /prices/heatmap | per spec |
| **GET /prices/mandis · GET /prices/crops** | **added** — dropdown data for forms |
| GET /buyers?crop=&district=&lot_id= | per spec; with `lot_id` returns ranked list + per-component formula |
| POST /requirements · GET /requirements/{id}/matches · GET /requirements/buyer/{id} | per spec; matches persisted to `requirement_matches` |
| **GET /requirements/open** | **added** — FPO desk "requirements available to pool" |
| GET /fpo/{id}/members · POST /fpo/{id}/pool-simulate | per spec |
| **GET /fpo/membership/{farmer_id}** | **added** — pre-fills the lot form's FPO link |
| POST /offers · POST /offers/{id}/accept · GET /offers/lot/{id} · GET /offers/buyer/{id} | per spec |
| **POST /offers/{id}/reject** | **added** — the spec's own buyer-offers page shows a "Rejected" status chip, so rejection must exist |
| **GET /offers/farmer/{id}** | **added** — farmer desk must show/accept incoming offers (demo step 7); no farmer-offers page exists in the Section 3 tree, so it lives on the farmer dashboard |
| GET /transactions/{id} · /farmer/{id} · /buyer/{id} · PATCH /transactions/{id}/status | per spec |
| POST /grievance · GET /grievance?status=&farmer_id= | per spec |
| **PATCH /grievance/{id}** | **added** — admin's simulated resolution dropdown |
| GET /admin/coverage · GET /admin/impact-model · GET /admin/grievances | per spec; impact response carries `"illustrative": true` |

---

## 7. KNOWN DEVIATIONS FROM SPEC (explicit list)

- **D1 — Demo-date anchoring is dynamic.** The golden price window is tuned around `date.today()` at seed-run time (deterministic given the same run date; `numpy.random.seed(26132)` kept). *Why:* the spec's price panel ended "mid-2026" but the demo must run on any day, with harvest date defaulting to today; a static 2025-era tuning window would break live. The pre-seeded golden lot + a fresh morning re-run reproduce HOLD/Aurangabad/₹4,694 exactly (§9).
- **D2 — Price panel extended past "mid 2026"** to seed-day + 60 days. *Why:* the 30-day forward grid must have data for lots created today.
- **D3 — `buyers` table gained `phone`, `interested_crop`, `typical_need_tonnes`, `min_grade`** (not in Section 5's column list). *Why:* Section 9 requires buyer phone logins and the Section 6.4 formula literally references these three fields.
- **D4 — `admins` table added** (Section 5 has none). *Why:* Section 9 requires a demo admin account.
- **D5 — `mandi_prices.grade` is stored as `'B'`** (base modal) on every row. *Why:* Section 4 defines one modal price per mandi×crop×day; grade adjustments apply at compute time via `grade_price_adjustment`.
- **D6 — transport table has no crop column** (per the exact Section 5 schema), so "cost varies slightly by crop bulkiness" is represented as per-pair variation (₹0.15–0.25/km) instead. *Why:* implementing crop-wise rates would have required changing the exact schema; chose schema-exact.
- **D7 — `max_safe_storage_days` is advisory.** The Section 6.2 grid is literally 0..30 as specified; the lot's `max_safe_storage_days` is returned inside `breakdown.inputs` for the UI/reviewer instead of clipping the grid. *Why:* "implement literally" won over implicit behaviour change.
- **D8 — Small router additions** (PATCH /lots, reject offer, offers/farmer, requirements/open, membership, meta endpoints) — each justified in §6; all are demo-enabling, none are new "smart" features.
- **D9 — Grid persisted in `recommendations.breakdown_json` is top-10** (plus best-today/best-future/inputs/constants/rule-branch); the FULL 775-cell grid is served by `/realisation/{id}` but not written per row. *Why:* keeps the audit row small while remaining exactly re-displayable; full grid is one GET away.
- **D10 — `components/buyer/*` not split into separate files** (RequirementForm/MatchTable/OfferCard logic is page-local). Everything else from the Section 3 tree exists as specified.
- **D11 — "Share via WhatsApp" opens `wa.me/?text=…`** with a plain-language summary — exactly the allowed mechanism; no Business API.
- **D12 — ESLint rule `@typescript-eslint/no-explicit-any` disabled** for prototype brevity; strict `tsc --noEmit` passes.
- **D13 — "One-click demo login" bypass added to /login** (post-build request): four buttons (Farmer/Buyer/FPO/Admin) that call the **same real `/auth/otp/verify` endpoint** with the seeded demo phone and the documented demo OTP `1234` auto-filled — no backend auth changes, purely a UI shortcut. Labelled "Just checking?" on screen.
- **D14 — Post-review fix round (i18n + polish):** 15 hardcoded English UI strings across FPO/Admin/Prices/Stepper/Map components were replaced with dictionary calls (BUG-1 fix); `localStorage` access hardened with try/catch (sandboxed-iframe safety); the buyer requirement form now shows the deadline as a formatted "07 Sep 2026"-style preview under the native date input (display-only); the seed generator now plants one realistic sample grievance (Ramesh Patil, Quality dispute) so the Admin desk is non-empty on a fresh seed. No behaviour or formula changes.
- **D15 — PATCH /lots null-clearing bug fixed during screenshot review:** the handler previously used `exclude_none=True`, which silently dropped explicit `"cash_need_amount": null` — the cash-need toggle could never turn OFF. Now `exclude_unset=True` (only fields the client actually sends are applied; explicit nulls clear). Verified by API test and UI round-trip. Also added: `docs/screenshots/` — 4 DOM-assertion-verified Playwright captures of the Analyze page (HOLD / PARTIAL+pool / new-lot-today) and the Buyer matches shortfall state.

Everything else — formulas, rule order, weights, thresholds, tables, pages, honesty labels — is implemented **as written**.

---

## 8. KNOWN LIMITATIONS / MOCKED ELEMENTS (the brutal-honesty list)

1. **All data is synthetic.** No live Agmarknet/e-NAM feed anywhere, including the prices page and heatmap.
2. **The golden demo prices are hand-tuned.** Around the demo date, Onion at Lasalgaon/Nashik/Aurangabad follows designed keyframe curves so the frozen demo numbers reproduce. Judges looking at a 90-day onion chart for those 3 mandis will see a shaped hump — this is intentional per spec (§4 golden record) and disclosed here.
3. **OTP is hardcoded `1234`**; `/auth/otp/request` sends nothing (commented DEMO ONLY).
4. **Truck IDs are random strings** generated on offer-accept; there is no dispatch/logistics backend. The stepper advances via PATCH (plus a visible "Advance (demo)" button on transaction rows) — a prototype control, labelled as such.
5. **No real payments/UPI/escrow** — payment status is a field; the stepper footer says "Prototype status stepper".
6. **Grievance resolution is a status dropdown** — no workflow engine, no notifications.
7. **"Create Digital Offer Listing"** just flips lot status to `LISTED`; there is no public marketplace page beyond the buyer desks.
8. **Impact model is formula-based on seeded data** (assumption: 2.5 lots/farmer/yr); it is labelled illustrative in the API response *and* with a non-dismissible UI badge.
9. **Buyer "Send Offer" prompts for a price** via a browser prompt dialog (prototype-grade UX, real API call).
10. **Map tiles load from OpenStreetMap** and need internet; without internet the Leaflet map shows markers on a blank background (a caption notes this). Charts and everything else are fully offline.
11. **FPO pool-simulator** computes the weighted average from member lots' best-today nets (capped at 60 lots for response time).
12. **Single-user-demo concurrency:** SQLite + per-process cached reference data; reseeding requires a backend restart (the seed self-contains this in its printed instructions).
13. **Recommendation history** accumulates as audit rows (by design), but there is no UI to browse old recommendations — only the latest is surfaced.
14. **FPO member table is intentionally sparse:** the FPO header shows the registry `member_count` (320 for the demo FPO), while only **3 farmers are actually mapped** in `fpo_members` with real lot/tonnage data (Ramesh Patil + 2 others). The on-screen caption "(N mapped in prototype DB)" discloses this every time — by design, not a bug.
15. **Language persistence mechanics:** the `LanguageProvider` sits at the **root layout** (mounted once, never remounted by client-side route changes), and the selection persists in `localStorage`. On a *hard* full-page load there is a one-frame English flash before the saved language applies (client-side i18n without SSR cookies — inherent trade-off, no per-page reset occurs).

---

## 9. DEMO SCRIPT WALKTHROUGH RESULT (re-run on fresh seed, through the frontend proxy)

| Step | Requirement | Result |
|------|-------------|--------|
| 1 | Login 9876543210 / OTP 1234 → Farmer desk (Ramesh Patil, Nashik) | **PASS** |
| 2 | Golden lot analyze → **HOLD 5 days @ Aurangabad, net ₹4,694.00/qtl**, full expandable breakdown | **PASS** |
| 3 | Storage OFF toggle → instantly **SWITCH_MANDI** (Lasalgaon, ₹2,898.55/qtl), never HOLD | **PASS** |
| 4 | Storage ON + cash need ₹80,000 → **PARTIAL_SALE**, allocation **2.76 t / 2.24 t** | **PASS** |
| 5 | FPO pooling on → 3-way split **2.76 / 1.344 / 0.896 t** | **PASS** |
| 6 | Buyer posts 10 t Grade-A Onion, Pune, 48 h → matches **7.2 t farmer + 1.4 t FPO pool = 8.6/10**, shortfall **1.4 t** shown in rust notice | **PASS** |
| 7 | Offer on matched lot → farmer accepts → **transaction with truck ID + stepper** (TRUCK_ASSIGNED → IN_TRANSIT via PATCH) | **PASS** |
| 8 | Farmer grievance → appears in **Admin grievances** (status changeable) | **PASS** |
| 9 | Admin dashboard: coverage stats (500/300/150/6, 25 mandis, 12 crops) + **illustrative impact model** + grievance list | **PASS** |

Executed end-to-end via `POST/GET/PATCH` against `http://localhost:3000/api/*` (the Next.js rewrite → FastAPI), i.e. the exact path the browser uses. No manual DB edits at any point.

---

## 10. DESIGN SELF-AUDIT (Section 1 forbidden patterns)

Avoided, verified against the code:
- ✅ No purple/blue gradients; no glassmorphism/frosted cards; no floating blobs; no dark mode (warm `#FAF6EE` background everywhere).
- ✅ No emoji as functional icons — Lucide only, literal icons (Sprout/Handshake/Users/ShieldCheck/IndianRupee/Truck/Warehouse/Scale/Calendar/MapPin/AlertTriangle/Share2).
- ✅ No "farmer + robot" artwork, no stock people, no illustrations at all.
- ✅ Corner radius 6 px cards / 4 px buttons — nothing pill-shaped.
- ✅ Elevation is 1 px border + `0 1px 2px rgba(0,0,0,0.06)` only.
- ✅ No centered marketing hero — login is four plain bordered role cards; every dashboard is a dense working tool (tables, line-item breakdowns, formula expandables are first-class).
- ✅ Tricolor 3 px strip + solid green government-portal top bar with wordmark, "Govt. of Maharashtra Pilot | MSInS", EN/हि/मराठी switch, role badge, logout — on every page.
- ✅ IBM Plex Sans + Noto Sans Devanagari, self-hosted (no Poppins/Inter SaaS look). Indian-numbering ₹ formatting (`₹4,694`) and explicit units next to every number.
- ✅ Bilingual micro-labels on farmer screens (मंडी/बाजार समिती, निव्वळ प्राप्ती, आता विका…).

The only two "gradient" uses are **semantic, hard-stop fills, not decoration**: the national tricolor strip, and the PARTIAL_SALE banner's 50/50 green/amber split (spec: "split-color banner"). No UI-library default theme leaked in — Tailwind tokens are fully custom; no shadcn/Radix defaults shipped.

---

## 11. SUGGESTIONS / IDEAS PARKED FOR LATER (NOT implemented, per Section 13)

1. Computed seasonality forecast shown as a dotted confidence band (would need a clearly-labelled statistical method — parked to avoid any "prediction" claim).
2. SMS/WhatsApp outbound via a real gateway with opt-in — parked (spec: wa.me link only).
3. Lot photo upload for buyer context — parked (spec forbids camera grading; plain photos could still help buyers, but it's out of scope).
4. e-NAM/Agmarknet adapter interface stub for future real data swap — parked (spec forbids claiming live integration).
5. Multi-language audio walkthrough of the recommendation for low-literacy users — parked.
6. Per-mandi arrival-trend chart on the analyze page — the arrival data is seeded and already in the heatmap tooltips; a dedicated chart was judged beyond the frozen page spec.
7. Recommendation audit-trail viewer (list past persisted breakdowns per lot) — the data is already persisted.

---

## 12. TIME / EFFORT REMAINING

**Nothing blocking the demo remains.** If more time were available, in demo-impact order:

1. (½ day) Full HI/MR coverage for the remaining buyer/FPO/admin micro-labels (i18n keys already exist for ~90% of strings).
2. (½ day) Replace `prompt()` offer-price dialogs with proper inline forms on the matches page.
3. (½ day) Recommendation audit-trail viewer page (backend already persists everything).
4. (1 day) Visual screenshot pass at 360 px width for low-end phone check + minor responsive fixes.
5. (1 day) A scripted `demo.sh` that replays Section 12 automatically for a rehearsal room check.

---

*Built exactly to the frozen spec. Where the spec was ambiguous, the simplest interpretation was chosen and documented above. — Team Hexamind*
