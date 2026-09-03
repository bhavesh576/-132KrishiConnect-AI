"use client";
// THE CROWN JEWEL SCREEN (Section 8): live-tunable lot analysis. Judges can
// flip Storage ON/OFF and cash-need inline and watch the decision recompute.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar, MapPin, Scale, Truck, Share2 } from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import DecisionCard from "@/components/farmer/DecisionCard";
import RealisationCard from "@/components/farmer/RealisationCard";
import AllocationSplitCard from "@/components/farmer/AllocationSplitCard";
import { Toggle } from "@/components/farmer/LotForm";
import { GradeChip } from "@/components/shared/StatusChip";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet, apiPatch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { inr, fmtDate } from "@/lib/format";

interface Lot {
  lot_id: number; crop: string; quantity_tonnes: number; quantity_qtl: number; grade: string;
  harvest_date: string; storage_available: boolean; cash_need_amount: number | null;
  cash_need_by_date: string | null; current_location_mandi_id: number; status: string;
  mandi_name?: string; district?: string; fpo_id: number | null;
}
interface Rec {
  recommendation_type: string; reason: string; best_mandi: any; day_offset: number;
  net_price_per_qtl: number;
  breakdown: { chosen: any; best_today: any; best_future: any; top10: any[]; rule_branch: string;
    allocation: any; inputs: any; constants: any };
}

function AnalyzeInner() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const lotId = Number(params.id);
  const session = getSession()!;
  const [lot, setLot] = useState<Lot | null>(null);
  const [rec, setRec] = useState<Rec | null>(null);
  const [alloc, setAlloc] = useState<any>(null);
  const [poolOn, setPoolOn] = useState(false);
  const [cashAmt, setCashAmt] = useState("");
  const [cashBy, setCashBy] = useState("");
  const [cashOn, setCashOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listingMsg, setListingMsg] = useState("");
  const first = useRef(true);

  const loadAll = useCallback(async (withPool: boolean) => {
    const l = await apiGet<Lot>(`/lots/${lotId}`);
    setLot(l);
    setCashOn(l.cash_need_amount !== null);
    if (l.cash_need_amount !== null) { setCashAmt(String(l.cash_need_amount)); setCashBy(l.cash_need_by_date ?? ""); }
    const r = await apiGet<Rec>(`/recommendation/${lotId}`);
    setRec(r);
    setAlloc(r.breakdown.allocation);
    if (withPool && l.fpo_id) {
      const a = await apiGet(`/allocation/${lotId}?fpo_pool=true`);
      setAlloc(a);
    }
  }, [lotId]);

  useEffect(() => { loadAll(false).catch(console.error); }, [loadAll]);

  const patchLot = async (payload: any) => {
    setBusy(true);
    try {
      await apiPatch(`/lots/${lotId}`, payload);
      await loadAll(poolOn);
    } finally { setBusy(false); }
  };

  const applyCash = async () => {
    setBusy(true);
    try {
      await apiPatch(`/lots/${lotId}`, cashOn
        ? { cash_need_amount: Number(cashAmt), cash_need_by_date: cashBy || undefined }
        : { cash_need_amount: null, cash_need_by_date: null });
      await loadAll(poolOn);
    } finally { setBusy(false); }
  };

  const togglePool = async () => {
    const next = !poolOn;
    setPoolOn(next);
    setBusy(true);
    try {
      if (next && lot?.fpo_id) setAlloc(await apiGet(`/allocation/${lotId}?fpo_pool=true`));
      else if (rec) setAlloc(rec.breakdown.allocation);
    } finally { setBusy(false); }
  };

  if (!lot || !rec) return <div className="p-8 text-sm text-muted">{t("common.loading")}</div>;

  const chosen = rec.breakdown.chosen;
  const top5: any[] = rec.breakdown.top10?.slice(0, 5) ?? [];
  const showAlloc = rec.recommendation_type === "PARTIAL_SALE" || (alloc?.fpo_pool_applied ?? false);

  const waText = encodeURIComponent(
    `KrishiConnect (prototype) — ${lot.crop} lot ${lot.quantity_tonnes}t Grade ${lot.grade}\n` +
    `Recommendation: ${rec.recommendation_type} — ${rec.best_mandi.mandi_name}` +
    (rec.recommendation_type === "HOLD" ? ` in ${rec.day_offset} days` : "") + `\n` +
    `Net: ₹${rec.net_price_per_qtl}/qtl (transport, storage & spoilage deducted). ` +
    `Synthetic demo data — formulas real.`
  );

  const recalcNote = busy ? <span className="ml-2 text-[11px] text-secondary">↻ {t("common.recalculate")}…</span> : null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10">
      <SubNav role="FARMER" />

      {/* 1. LOT SUMMARY BAR with live toggles */}
      <section className="kc-card mt-4 p-4" data-testid="lot-summary">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <h1 className="text-lg font-bold">
              {lot.crop} · {tonnes_(lot.quantity_tonnes)} <GradeChip grade={lot.grade} />
            </h1>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
              <MapPin size={12} /> {lot.mandi_name} ({lot.district})
              <Calendar size={12} className="ml-2" /> {fmtDate(lot.harvest_date)}
              <Scale size={12} className="ml-2" /> {lot.quantity_qtl} {t("labels.qtlUnit")}
              <span className="ml-2">#{lot.lot_id}</span>
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted">{t("labels.storageToggle")}</span>
              <Toggle on={lot.storage_available} setOn={(v) => patchLot({ storage_available: v })}
                onLabel={t("labels.on")} offLabel={t("labels.off")} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted">{t("labels.cashNeed")}</span>
              <Toggle on={cashOn} setOn={setCashOn} onLabel="Yes" offLabel="No" />
            </div>
            {cashOn && (
              <div className="flex items-end gap-2">
                <div>
                  <label className="kc-label">{t("labels.cashAmount")}</label>
                  <input type="number" className="kc-input mt-0.5 w-32" value={cashAmt}
                    onChange={(e) => setCashAmt(e.target.value)} />
                </div>
                <div>
                  <label className="kc-label">{t("labels.cashNeededBy")}</label>
                  <input type="date" className="kc-input mt-0.5 w-36" value={cashBy}
                    onChange={(e) => setCashBy(e.target.value)} />
                </div>
                <button className="kc-btn" disabled={busy} onClick={applyCash}>{t("common.recalculate")}</button>
              </div>
            )}
          </div>
        </div>
        {lot.fpo_id && (
          <div className="mt-3 flex items-center gap-2 border-t border-borderc pt-3">
            <span className="text-xs font-semibold uppercase text-muted">{t("ui.fpoPooling")}</span>
            <Toggle on={poolOn} setOn={togglePool} onLabel={t("labels.on")} offLabel={t("labels.off")} />
            <span className="text-[11px] text-muted">{t("labels.poolDesc")}</span>
          </div>
        )}
        {recalcNote}
      </section>

      {/* 2. RECOMMENDATION BANNER */}
      <div className="mt-4">
        <DecisionCard type={rec.recommendation_type} reason={rec.reason}
          mandiName={rec.best_mandi.mandi_name} dayOffset={rec.day_offset} net={rec.net_price_per_qtl} />
        <p className="mt-1 text-right text-[10px] text-muted">{t("ui.tracePrefix")} {rec.breakdown.rule_branch} · 25 × 31 · 3%</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* 3. NET REALISATION */}
        <RealisationCard row={chosen} quantityTonnes={lot.quantity_tonnes} />

        <div className="space-y-4">
          {/* 4. COMPARISON MINI-TABLE */}
          <section className="kc-card p-4" data-testid="comparison-table">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("labels.comparison")}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="kc-th">{t("labels.mandi")} · बाजार समिती</th>
                  <th className="kc-th">{t("labels.day")}</th>
                  <th className="kc-th text-right">Net (₹/{t("labels.qtlUnit")})</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((g, i) => (
                  <tr key={`${g.mandi_id}-${g.day_offset}`} className={i === 0 ? "bg-primary/10 font-semibold" : ""}>
                    <td className="kc-td">{g.mandi_name}{i === 0 && <span className="ml-1.5 text-[10px] text-primary">★ BEST</span>}</td>
                    <td className="kc-td">{g.day_offset === 0 ? t("ui.today") : `+${g.day_offset} ${t("labels.days")}`}</td>
                    <td className="kc-td text-right font-mono tabular-nums">{inr(g.net_per_qtl, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 5. ALLOCATION SPLIT */}
          {showAlloc && alloc && (
            <AllocationSplitCard sellNow={alloc.sell_now_tonnes} hold={alloc.hold_tonnes}
              pool={alloc.pool_fpo_tonnes} breakdown={alloc.breakdown} />
          )}
        </div>
      </div>

      {/* 6. ACTION ROW */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <button className="kc-btn" disabled={busy || lot.status === "LISTED" || lot.status === "SOLD"}
          onClick={async () => { await patchLot({ status: "LISTED" }); setListingMsg(t("common.listed")); }}
          data-testid="create-listing">
          <Truck size={15} /> {t("common.createListing")}
        </button>
        <a className="kc-btn-outline" data-testid="whatsapp-share"
          href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer">
          <Share2 size={15} /> {t("common.shareWhatsapp")}
        </a>
        <Link className="kc-btn-outline" href={`/farmer/buyers?lot_id=${lot.lot_id}`}>
          {t("common.viewRankedBuyers")} →
        </Link>
        {listingMsg && <span className="text-xs font-semibold text-[#3C7A34]">{listingMsg}</span>}
        <span className="text-[11px] text-muted">{t("analysis.offerListingHint")}</span>
      </div>
    </div>
  );
}

const tonnes_ = (n: number) => `${n} t`;

export default function Page() {
  return <RoleGuard role="FARMER"><AnalyzeInner /></RoleGuard>;
}
