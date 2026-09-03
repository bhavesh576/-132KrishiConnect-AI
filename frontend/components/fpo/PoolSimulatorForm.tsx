"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import FormulaBreakdown from "@/components/shared/FormulaBreakdown";
import { apiPost } from "@/lib/api";
import { inr } from "@/lib/format";

// 6.6 pool premium simulator: premium = min(max, base + floor(t/step)×inc)
export default function PoolSimulatorForm({ fpoId }: { fpoId: number }) {
  const { t } = useT();
  const [tonnesVal, setTonnesVal] = useState(20);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const simulate = async (v: number) => {
    setBusy(true);
    try {
      setResult(await apiPost(`/fpo/${fpoId}/pool-simulate`, { tonnes: v }));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="kc-card p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide">{t("nav.poolSimulator")} · पूल कॅल्क्युलेटर</h3>
        <label className="mt-4 block">
          <span className="kc-label">{t("labels.pooledTonnes")}</span>
          <input type="number" min="0" step="1" className="kc-input mt-1 max-w-[160px]"
            value={tonnesVal} onChange={(e) => setTonnesVal(Number(e.target.value))} />
        </label>
        <input type="range" min={0} max={60} step={1} value={tonnesVal} aria-label={t("labels.pooledTonnes")}
          onChange={(e) => setTonnesVal(Number(e.target.value))}
          onMouseUp={() => simulate(tonnesVal)} onTouchEnd={() => simulate(tonnesVal)}
          className="mt-3 w-full accent-[#1B5E3A]" />
        <button className="kc-btn mt-3" disabled={busy} onClick={() => simulate(tonnesVal)}>
          {t("common.recalculate")}
        </button>
        <p className="mt-3 text-[11px] text-muted">
          {t("ui.poolConstants")}
        </p>
      </div>
      <div className="kc-card p-4" data-testid="pool-result">
        {result ? (
          <>
            <div className="flex gap-6">
              <div>
                <div className="text-[11px] uppercase text-muted">{t("labels.premiumPct")}</div>
                <div className="text-2xl font-bold text-secondary">{result.premium_pct}%</div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-muted">{t("labels.pooledNet")}</div>
                <div className="text-2xl font-bold text-primary">{inr(result.pooled_net_price_per_qtl, true)}<span className="text-xs font-normal text-muted">/{t("labels.qtlUnit")}</span></div>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {t("ui.poolWeightedAvg")} {inr(result.weighted_avg_net_per_qtl, true)}/qtl × (1 + {result.premium_pct}%)
            </p>
            <div className="mt-3">
              <FormulaBreakdown lines={[result.formula]} defaultOpen />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{t("labels.noData")} — {t("common.recalculate")}</p>
        )}
      </div>
    </div>
  );
}
