"use client";
import { useEffect, useState } from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";
import { tonnes, fmtDate } from "@/lib/format";

function FpoRequirementsInner() {
  const { t } = useT();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { apiGet("/requirements/open").then(setRows); }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="FPO" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.requirementsAvail")}</h1>
      <p className="text-xs text-muted">{t("ui.fpoReqsSubtitle")}</p>
      <section className="kc-card mt-4 p-4">
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
              {rows.map((r) => (
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
              {!rows.length && <tr><td colSpan={7} className="kc-td text-center text-muted">{t("labels.noData")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="FPO"><FpoRequirementsInner /></RoleGuard>;
}
