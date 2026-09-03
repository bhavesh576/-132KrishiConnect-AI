"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import FormulaBreakdown from "@/components/shared/FormulaBreakdown";
import { apiGet } from "@/lib/api";
import { inr } from "@/lib/format";

// Modelled impact — formula-based projection. The illustrative badge is
// NON-DISMISSIBLE and always visible (spec requirement).
export default function ImpactModelCard({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  const [adoption, setAdoption] = useState(10000);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const run = async (v: number) => {
    setBusy(true);
    try { setResult(await apiGet(`/admin/impact-model?adoption=${v}`)); }
    finally { setBusy(false); }
  };

  return (
    <div className="kc-card p-4" data-testid="impact-card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide">{t("labels.impactModel")} · मॉडेल केलेला परिणाम</h3>
        <span className="kc-chip shrink-0 border-secondary bg-secondary/15 text-secondary" data-testid="illustrative-badge">
          ⓘ {t("labels.illustrative")}
        </span>
      </div>
      <label className="mt-4 block">
        <span className="kc-label">{t("labels.adoption")}</span>
        <div className="mt-1 flex items-center gap-3">
          <input type="number" min={1000} max={100000} step={1000} className="kc-input w-36"
            value={adoption} onChange={(e) => setAdoption(Number(e.target.value))} />
          <input type="range" min={1000} max={100000} step={1000} value={adoption} aria-label={t("labels.adoption")}
            onChange={(e) => setAdoption(Number(e.target.value))}
            onMouseUp={() => run(adoption)} onTouchEnd={() => run(adoption)}
            className="flex-1 accent-[#1B5E3A]" />
        </div>
      </label>
      <button className="kc-btn mt-3" disabled={busy} onClick={() => run(adoption)}>{t("common.recalculate")}</button>

      {result && (
        <div className="mt-4 rounded-card border border-primary bg-primary px-4 py-3 text-white">
          <div className="text-[11px] uppercase tracking-wide opacity-80">{t("labels.projectedBenefit")}</div>
          <div className="text-2xl font-bold tabular-nums">{inr(result.projected_annual_benefit_inr)}</div>
          <div className="mt-1 text-[11px] opacity-90">
            {t("labels.avgNet")}: {result.inputs.avg_net_uplift_pct}% · {t("labels.avgLotValue")}: {inr(result.inputs.avg_lot_value)} · lots sampled: {result.inputs.lots_sampled}
          </div>
        </div>
      )}
      {result && (
        <div className="mt-3">
          <FormulaBreakdown lines={[result.formula, `lots_per_farmer_per_year = ${result.inputs.lots_per_farmer_per_year} (modelled assumption)`]} defaultOpen={!compact} />
        </div>
      )}
    </div>
  );
}
