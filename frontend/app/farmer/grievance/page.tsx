"use client";
import { useCallback, useEffect, useState } from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import GrievanceForm from "@/components/shared/GrievanceForm";
import StatusChip from "@/components/shared/StatusChip";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { fmtDate } from "@/lib/format";

function GrievanceInner() {
  const { t } = useT();
  const session = getSession()!;
  const [rows, setRows] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  const load = useCallback(async () => {
    setRows(await apiGet(`/grievance?farmer_id=${session.user_id}`));
    setTxns(await apiGet(`/transactions/farmer/${session.user_id}`));
  }, [session.user_id]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8">
      <SubNav role="FARMER" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.grievance")} · तक्रार</h1>
      <div className="mt-4">
        <GrievanceForm farmerId={session.user_id}
          txns={txns.map((x) => ({ txn_id: x.txn_id, crop: x.crop, buyer_name: x.buyer_name, truck_id: x.truck_id }))}
          onCreated={load} />
      </div>
      <section className="kc-card mt-4 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("labels.grievances")} — {t("labels.myLots").toLowerCase()}</h3>
        <table className="w-full">
          <thead><tr>
            <th className="kc-th">#</th><th className="kc-th">{t("labels.category")}</th>
            <th className="kc-th">{t("labels.description")}</th><th className="kc-th">{t("labels.status")}</th>
            <th className="kc-th">{t("labels.harvestDate")}</th>
          </tr></thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.grievance_id}>
                <td className="kc-td">#{g.grievance_id}</td>
                <td className="kc-td">{t(`cat.${g.category}`)}</td>
                <td className="kc-td max-w-[280px] truncate" title={g.description}>{g.description}</td>
                <td className="kc-td"><StatusChip status={g.status} /></td>
                <td className="kc-td text-xs text-muted">{fmtDate(g.created_at)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="kc-td text-center text-muted" colSpan={5}>{t("labels.noData")}</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="FARMER"><GrievanceInner /></RoleGuard>;
}
