"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Send, CheckCircle2 } from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import StatCard from "@/components/shared/StatCard";
import StatusChip from "@/components/shared/StatusChip";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { tonnes, fmtDate } from "@/lib/format";

function BuyerDashboardInner() {
  const { t } = useT();
  const session = getSession()!;
  const [reqs, setReqs] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    apiGet(`/requirements/buyer/${session.user_id}`).then(setReqs);
    apiGet(`/offers/buyer/${session.user_id}`).then(setOffers);
    apiGet(`/transactions/buyer/${session.user_id}`).then(setTxns);
  }, [session.user_id]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="BUYER" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{session.name}</h1>
          <p className="text-xs text-muted">{t("nav.dashboard")} · डॅशबोर्ड</p>
        </div>
        <Link href="/buyer/requirements/new" className="kc-btn" data-testid="new-requirement">
          {t("nav.postRequirement")}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label={t("labels.openRequirements")} sub="खुल्या मागण्या"
          value={reqs.filter((r) => r.status === "OPEN").length} icon={<ClipboardList size={20} />} />
        <StatCard label={t("labels.activeOffers")} sub="सक्रिय ऑफर"
          value={offers.filter((o) => o.status === "PENDING").length} icon={<Send size={20} />} />
        <StatCard label={t("labels.completedTxns")} sub="पूर्ण व्यवहार" value={txns.length} icon={<CheckCircle2 size={20} />} />
      </div>

      <section className="kc-card mt-4 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("nav.requirements")} · माझ्या मागण्या</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead><tr>
              <th className="kc-th">#</th><th className="kc-th">{t("labels.crop")}</th>
              <th className="kc-th">{t("labels.qty")}</th><th className="kc-th">{t("labels.minGrade")}</th>
              <th className="kc-th">{t("labels.destinationDistrict")}</th>
              <th className="kc-th">{t("labels.deadlineDate")}</th><th className="kc-th">{t("labels.status")}</th>
              <th className="kc-th"></th>
            </tr></thead>
            <tbody>
              {reqs.map((r) => (
                <tr key={r.req_id}>
                  <td className="kc-td">#{r.req_id}</td>
                  <td className="kc-td font-medium">{r.crop}</td>
                  <td className="kc-td">{tonnes(r.quantity_tonnes)}</td>
                  <td className="kc-td">{r.grade}</td>
                  <td className="kc-td">{r.destination_district}</td>
                  <td className="kc-td">{fmtDate(r.deadline_date)}</td>
                  <td className="kc-td"><StatusChip status={r.status} /></td>
                  <td className="kc-td text-right">
                    <Link className="kc-btn-outline" href={`/buyer/requirements/${r.req_id}/matches`}>
                      {t("common.analyze")} →
                    </Link>
                  </td>
                </tr>
              ))}
              {!reqs.length && <tr><td colSpan={8} className="kc-td text-center text-muted">{t("labels.noData")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="BUYER"><BuyerDashboardInner /></RoleGuard>;
}
