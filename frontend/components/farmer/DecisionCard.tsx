"use client";
import { useT } from "@/components/i18n/LanguageProvider";
import { inr } from "@/lib/format";

// Colored decision banner. SELL_NOW = green, HOLD = amber, SWITCH_MANDI = rust,
// PARTIAL_SALE = semantic split of green+amber (two solid halves).
const STYLE: Record<string, { bar: string; chip: string; text: string }> = {
  SELL_NOW: { bar: "bg-[#3C7A34]", chip: "border-[#3C7A34] bg-[#3C7A34] text-white", text: "text-[#123D26]" },
  HOLD: { bar: "bg-secondary", chip: "border-secondary bg-secondary text-white", text: "text-[#5C3A0E]" },
  SWITCH_MANDI: { bar: "bg-[#A8432E]", chip: "border-[#A8432E] bg-[#A8432E] text-white", text: "text-[#5C1F12]" },
  PARTIAL_SALE: { bar: "bg-[linear-gradient(90deg,#3C7A34_0%,#3C7A34_50%,#C97B24_50%,#C97B24_100%)]", chip: "border-[#123D26] bg-[#123D26] text-white", text: "text-[#123D26]" },
  NO_DATA: { bar: "bg-muted", chip: "border-muted bg-muted text-white", text: "text-muted" },
};

export default function DecisionCard({
  type,
  reason,
  mandiName,
  dayOffset,
  net,
  headline,
}: {
  type: string;
  reason: string;
  mandiName?: string;
  dayOffset?: number;
  net?: number;
  headline?: string;
}) {
  const { t } = useT();
  const s = STYLE[type] ?? STYLE.NO_DATA;
  const defaultHeadline =
    type === "HOLD"
      ? `${t("rec.HOLD")} ${dayOffset} ${t("labels.days")} — ${mandiName} · ${inr(net)}/${t("labels.qtlUnit")}`
      : type === "SWITCH_MANDI"
      ? `${t("rec.SWITCH_MANDI")} — ${mandiName} · ${inr(net)}/${t("labels.qtlUnit")}`
      : type === "SELL_NOW"
      ? `${t("rec.SELL_NOW")} — ${mandiName} · ${inr(net)}/${t("labels.qtlUnit")}`
      : t(`rec.${type}`);

  return (
    <section className="kc-card overflow-hidden" data-testid="decision-banner">
      <div className={`h-1.5 w-full ${s.bar}`} aria-hidden />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className={`kc-chip px-2 py-1 text-xs uppercase tracking-wide ${s.chip}`}>
          {t(`rec.${type}`)}
        </span>
        <div>
          <p className={`text-base font-bold ${s.text}`}>{headline ?? defaultHeadline}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{reason}</p>
        </div>
      </div>
    </section>
  );
}
