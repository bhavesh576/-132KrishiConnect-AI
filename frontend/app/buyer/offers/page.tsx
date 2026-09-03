"use client";
import { useEffect, useState } from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import StatusChip from "@/components/shared/StatusChip";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { inr, tonnes, fmtDate } from "@/lib/format";

function OffersInner() {
  const { t } = useT();
  const session = getSession()!;
  const [offers, setOffers] = useState<any[]>([]);
  useEffect(() => {
    apiGet(`/offers/buyer/${session.user_id}`).then(setOffers);
  }, [session.user_id]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="BUYER" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.offers")} · ऑफर</h1>
      <section className="kc-card mt-4 p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead><tr>
              <th className="kc-th">#</th><th className="kc-th">{t("labels.lot")}</th>
              <th className="kc-th">{t("labels.crop")}</th><th className="kc-th">{t("labels.price")} (₹/{t("labels.qtlUnit")})</th>
              <th className="kc-th">{t("labels.offeredQty")}</th>
              <th className="kc-th">{t("labels.status")}</th><th className="kc-th">{t("labels.harvestDate")}</th>
            </tr></thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.offer_id}>
                  <td className="kc-td">#{o.offer_id}</td>
                  <td className="kc-td">lot #{o.lot_id}</td>
                  <td className="kc-td">{o.crop}</td>
                  <td className="kc-td font-mono">{inr(o.offered_price_per_qtl)}</td>
                  <td className="kc-td">{tonnes(o.offered_qty_tonnes)}</td>
                  <td className="kc-td"><StatusChip status={o.status} /></td>
                  <td className="kc-td text-xs text-muted">{fmtDate(o.created_at)}</td>
                </tr>
              ))}
              {!offers.length && <tr><td colSpan={7} className="kc-td text-center text-muted">{t("labels.noData")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="BUYER"><OffersInner /></RoleGuard>;
}
