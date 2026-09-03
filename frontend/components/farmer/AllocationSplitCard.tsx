"use client";
import { useT } from "@/components/i18n/LanguageProvider";
import FormulaBreakdown from "@/components/shared/FormulaBreakdown";

// Stacked horizontal bar split: Sell now / Hold / Pool to FPO (tonnes).
export default function AllocationSplitCard({
  sellNow,
  hold,
  pool,
  breakdown,
  summary,
}: {
  sellNow: number;
  hold: number;
  pool: number;
  breakdown: any;
  summary?: string;
}) {
  const { t } = useT();
  const total = Math.max(sellNow + hold + pool, 1e-9);
  const seg = (v: number) => `${(v / total) * 100}%`;

  const lines = [
    breakdown?.formula ?? "",
    breakdown?.pool_formula ?? "",
  ].filter(Boolean);

  const defaultSummary = `${t("labels.sellNow")} ${sellNow.toFixed(2)} t · ${t("labels.hold")} ${hold.toFixed(2)} t${
    pool > 0 ? ` · ${t("labels.poolFpo")} ${pool.toFixed(2)} t` : ""
  }`;

  return (
    <section className="kc-card p-4" data-testid="allocation-card">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">{t("labels.allocation")} · वाटप</h3>
      <div className="flex h-8 w-full overflow-hidden rounded-card border border-borderc" role="img"
        aria-label={summary ?? defaultSummary}>
        {sellNow > 0 && (
          <div className="flex items-center justify-center bg-[#3C7A34] text-[11px] font-semibold text-white"
            style={{ width: seg(sellNow) }} title={`${t("labels.sellNow")}: ${sellNow} t`}>
            {sellNow.toFixed(2)}t
          </div>
        )}
        {hold > 0 && (
          <div className="flex items-center justify-center bg-secondary text-[11px] font-semibold text-white"
            style={{ width: seg(hold) }} title={`${t("labels.hold")}: ${hold} t`}>
            {hold.toFixed(2)}t
          </div>
        )}
        {pool > 0 && (
          <div className="flex items-center justify-center bg-primary text-[11px] font-semibold text-white"
            style={{ width: seg(pool) }} title={`${t("labels.poolFpo")}: ${pool} t`}>
            {pool.toFixed(2)}t
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#3C7A34]" />{t("labels.sellNow")}: <b className="text-textc">{sellNow.toFixed(2)} t</b></span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-secondary" />{t("labels.hold")}: <b className="text-textc">{hold.toFixed(2)} t</b></span>
        {pool > 0 && (
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />{t("labels.poolFpo")}: <b className="text-textc">{pool.toFixed(2)} t</b></span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">{summary ?? defaultSummary}</p>
      <div className="mt-3">
        <FormulaBreakdown lines={lines} />
      </div>
    </section>
  );
}
