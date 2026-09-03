"use client";
import { useCallback, useEffect, useState } from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import GrievanceTable from "@/components/admin/GrievanceTable";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";

function AdminGrievancesInner() {
  const { t } = useT();
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setRows(await apiGet(`/admin/grievances?status=${status}`));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="ADMIN" />
      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold">{t("nav.grievances")} · तक्रारी</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase text-muted">{t("common.filter")}</label>
          <select className="kc-input w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("common.all")}</option>
            <option value="OPEN">{t("status.OPEN")}</option>
            <option value="IN_REVIEW">{t("status.IN_REVIEW")}</option>
            <option value="RESOLVED">{t("status.RESOLVED")}</option>
          </select>
        </div>
      </div>
      <section className="kc-card mt-4 p-4">
        <GrievanceTable rows={rows} onChanged={load} />
        <p className="mt-2 text-[11px] text-muted">{t("ui.simResolution")}</p>
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="ADMIN"><AdminGrievancesInner /></RoleGuard>;
}
