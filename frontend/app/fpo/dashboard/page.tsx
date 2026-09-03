"use client";
import { useEffect, useState } from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import MemberList from "@/components/fpo/MemberList";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { tonnes, fmtDate } from "@/lib/format";

function FpoDashboardInner() {
  const { t } = useT();
  const session = getSession()!;
  const [data, setData] = useState<any>(null);
  const [openReqs, setOpenReqs] = useState<any[]>([]);

  useEffect(() => {
    apiGet(`/fpo/${session.user_id}/members`).then(setData);
    apiGet("/requirements/open").then(setOpenReqs);
  }, [session.user_id]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="FPO" />
      <h1 className="mt-4 text-lg font-bold">{data?.fpo?.name ?? session.name}</h1>
      <p className="text-xs text-muted">
        {t("labels.memberCount")}: {data?.fpo?.member_count ?? "—"} · {t("labels.contact")}: {data?.fpo?.contact ?? "—"} · {t("labels.district")}: {data?.fpo?.district}
      </p>

      <section className="kc-card mt-4 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">
          {t("labels.members")} · सदस्य <span className="ml-1 text-[10px] font-normal normal-case text-muted">({data?.members?.length ?? 0} {t("ui.mappedNote")})</span>
        </h3>
        <MemberList members={data?.members ?? []} />
      </section>

      <section className="kc-card mt-4 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("nav.requirementsAvail")} · खुल्या खरेदीदार मागण्या</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead><tr>
              <th className="kc-th">#</th><th className="kc-th">{t("labels.buyer")}</th>
              <th className="kc-th">{t("labels.crop")}</th><th className="kc-th">{t("labels.qty")}</th>
              <th className="kc-th">{t("labels.minGrade")}</th>
              <th className="kc-th">{t("labels.destinationDistrict")}</th>
              <th className="kc-th">{t("labels.deadlineDate")}</th>
            </tr></thead>
            <tbody>
              {openReqs.map((r) => (
                <tr key={r.req_id}>
                  <td className="kc-td">#{r.req_id}</td>
                  <td className="kc-td">{r.buyer_name} <span className="text-[11px] text-muted">({r.buyer_type})</span></td>
                  <td className="kc-td font-medium">{r.crop}</td>
                  <td className="kc-td">{tonnes(r.quantity_tonnes)}</td>
                  <td className="kc-td">{r.grade}</td>
                  <td className="kc-td">{r.destination_district}</td>
                  <td className="kc-td">{fmtDate(r.deadline_date)}</td>
                </tr>
              ))}
              {!openReqs.length && <tr><td colSpan={7} className="kc-td text-center text-muted">{t("labels.noData")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="FPO"><FpoDashboardInner /></RoleGuard>;
}
