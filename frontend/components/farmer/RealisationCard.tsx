"use client";
import { useT } from "@/components/i18n/LanguageProvider";
import FormulaBreakdown from "@/components/shared/FormulaBreakdown";
import { inr } from "@/lib/format";

interface Row {
  mandi_name: string;
  day_offset: number;
  modal_price_per_qtl: number;
  grade_pct_adjustment: number;
  gross_per_qtl: number;
  transport_per_qtl: number;
  transport_distance_km: number;
  storage_per_qtl: number;
  spoilage_per_qtl: number;
  net_per_qtl: number;
}

// Net Realisation card — ALWAYS shows the line items, never just one number,
// with the literal formula expandable (core honesty constraint).
export default function RealisationCard({
  row,
  quantityTonnes,
}: {
  row: Row;
  quantityTonnes: number;
}) {
  const { t } = useT();
  const qtlQty = quantityTonnes * 10;
  const total = row.net_per_qtl * qtlQty;

  const lines = [
    `Gross        = ₹${row.modal_price_per_qtl.toFixed(2)} × (1 + ${row.grade_pct_adjustment}% grade) = ₹${row.gross_per_qtl.toFixed(2)}/qtl`,
    `Transport    = loading + ${row.transport_distance_km} km × rate = ₹${row.transport_per_qtl.toFixed(2)}/qtl`,
    `Storage      = ${row.day_offset === 0 ? "0 (selling day 0)" : `rate/day × ${row.day_offset} days`} = ₹${row.storage_per_qtl.toFixed(2)}/qtl`,
    `Spoilage     = ₹${row.gross_per_qtl.toFixed(2)} × spoilage%/day × grade mult. × ${row.day_offset} days = ₹${row.spoilage_per_qtl.toFixed(2)}/qtl`,
    `─────────────────────────────────────────────`,
    `NET          = ${row.gross_per_qtl.toFixed(2)} − ${row.transport_per_qtl.toFixed(2)} − ${row.storage_per_qtl.toFixed(2)} − ${row.spoilage_per_qtl.toFixed(2)} = ₹${row.net_per_qtl.toFixed(2)}/qtl`,
    `Total in-hand = ₹${row.net_per_qtl.toFixed(2)}/qtl × ${qtlQty} qtl (${quantityTonnes} t) = ₹${Math.round(total).toLocaleString("en-IN")}`,
  ];

  const items = [
    { label: t("labels.gross"), bi: t("formBi.gross"), value: row.gross_per_qtl, sign: "" },
    { label: t("labels.transport"), bi: t("formBi.transport"), value: -row.transport_per_qtl, sign: "−" },
    { label: t("labels.storage"), bi: t("formBi.storageCost"), value: -row.storage_per_qtl, sign: "−" },
    { label: t("labels.spoilage"), bi: t("formBi.spoilage"), value: -row.spoilage_per_qtl, sign: "−" },
  ];

  return (
    <section className="kc-card p-4" data-testid="realisation-card">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-textc">
          {t("formBi.netRealisation")} <span className="font-normal normal-case text-muted">/ Net Realisation</span>
        </h3>
        <span className="text-xs text-muted">
          {row.mandi_name} · {t("labels.day")} {row.day_offset}
        </span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((it) => (
            <tr key={it.label} className="border-b border-borderc/60">
              <td className="py-1.5 text-textc">
                {it.sign && <span className="mr-1 text-muted">{it.sign}</span>}
                {it.label}
                <span className="ml-1.5 text-[11px] text-muted">{it.bi}</span>
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums">
                {inr(Math.abs(it.value), true)}
                <span className="ml-1 text-[10px] text-muted">/{t("labels.qtlUnit")}</span>
              </td>
            </tr>
          ))}
          <tr className="border-b-2 border-primary/40 bg-[#F5F0E4]">
            <td className="py-2 font-bold text-textc">
              = {t("formBi.net")} <span className="ml-1 text-[11px] font-normal text-muted">{t("formBi.net")}</span>
            </td>
            <td className="py-2 text-right font-mono text-base font-bold tabular-nums text-primary">
              {inr(row.net_per_qtl, true)}
              <span className="ml-1 text-[10px] font-normal text-muted">/{t("labels.qtlUnit")}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 rounded-card border border-primary bg-primary px-3.5 py-2.5 text-white">
        <div className="text-[11px] uppercase tracking-wide opacity-80">{t("labels.totalInHand")} · {t("formBi.totalInHand")}</div>
        <div className="text-2xl font-bold tabular-nums" data-testid="total-in-hand">
          {inr(total)}
          <span className="ml-2 text-xs font-normal opacity-80">
            = {inr(row.net_per_qtl, true)}/{t("labels.qtlUnit")} × {qtlQty} {t("labels.qtlUnit")}
          </span>
        </div>
      </div>
      <div className="mt-3">
        <FormulaBreakdown lines={lines} title={t("common.showFormula")} />
      </div>
    </section>
  );
}
