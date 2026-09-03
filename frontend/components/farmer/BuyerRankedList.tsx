"use client";
import { useT } from "@/components/i18n/LanguageProvider";
import FormulaBreakdown from "@/components/shared/FormulaBreakdown";
import { km } from "@/lib/format";

interface RankedBuyer {
  buyer_id: number; name: string; buyer_type: string; district: string;
  verified_flag: boolean; payment_reliability_score: number; avg_payment_days: number;
  distance_km: number; match_pct: number; components: any; formula: string;
  interested_crop?: string; typical_need_tonnes?: number; min_grade?: string;
}

const TYPE_COLORS: Record<string, string> = {
  Wholesaler: "border-primary/40 bg-primary/10 text-primary",
  Processor: "border-secondary/40 bg-secondary/10 text-secondary",
  "Institutional Buyer": "border-[#123D26]/40 bg-[#123D26]/10 text-[#123D26]",
  Exporter: "border-[#A8432E]/40 bg-[#A8432E]/10 text-[#A8432E]",
  Retailer: "border-borderc bg-[#F5F0E4] text-muted",
};

// Ranked buyer cards. match_pct shown top-right IS the ranking score
// (single source of truth — spec bug fix).
export default function BuyerRankedList({
  buyers,
  onSendOffer,
}: {
  buyers: RankedBuyer[];
  onSendOffer: (b: RankedBuyer) => void;
}) {
  const { t } = useT();
  if (!buyers.length) return <p className="p-6 text-sm text-muted">{t("labels.noData")}</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {buyers.map((b) => (
        <article key={b.buyer_id} className="kc-card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-textc">{b.name}</h4>
                {b.verified_flag && (
                  <span title={t("labels.verified")} aria-label={t("labels.verified")}
                    className="kc-chip border-[#3C7A34]/50 bg-[#3C7A34]/10 text-[#3C7A34]">✔ {t("labels.verified")}</span>
                )}
              </div>
              <span className={`kc-chip mt-1 ${TYPE_COLORS[b.buyer_type] ?? ""}`}>{b.buyer_type}</span>
            </div>
            <div className="rounded-card border border-primary bg-primary px-2 py-1 text-center text-white">
              <div className="text-base font-bold leading-none">{b.match_pct}%</div>
              <div className="text-[9px] uppercase opacity-80">{t("labels.matchScore")}</div>
            </div>
          </div>
          <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
            <div><dt className="inline">{t("labels.paymentReliability")}: </dt>
              <dd className="inline font-semibold text-textc">{b.payment_reliability_score}/100</dd>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-borderc">
                <span className="block h-full bg-[#3C7A34]" style={{ width: `${b.payment_reliability_score}%` }} />
              </span>
            </div>
            <div><dt className="inline">{t("labels.avgPaymentDays")}: </dt>
              <dd className="inline font-semibold text-textc">{b.avg_payment_days}</dd></div>
            <div><dt className="inline">{t("labels.distance")}: </dt>
              <dd className="inline font-semibold text-textc">{km(b.distance_km)}</dd></div>
            <div><dt className="inline">{t("labels.district")}: </dt>
              <dd className="inline font-semibold text-textc">{b.district}</dd></div>
          </dl>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <FormulaBreakdown lines={[b.formula]} title="Show match formula" />
            <button className="kc-btn shrink-0" onClick={() => onSendOffer(b)}>
              {t("common.sendOffer")}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
