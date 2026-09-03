"use client";
import { useT } from "@/components/i18n/LanguageProvider";
import StatusChip from "@/components/shared/StatusChip";
import { apiPatch } from "@/lib/api";
import { fmtDate } from "@/lib/format";

// All grievances across farmers; simulated resolution via status dropdown.
export default function GrievanceTable({ rows, onChanged }: { rows: any[]; onChanged: () => void }) {
  const { t } = useT();
  const set = async (id: number, status: string) => {
    await apiPatch(`/grievance/${id}`, { status });
    onChanged();
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px]" data-testid="grievance-table">
        <thead><tr>
          <th className="kc-th">#</th><th className="kc-th">{t("labels.farmer")}</th>
          <th className="kc-th">{t("labels.category")}</th><th className="kc-th">{t("labels.description")}</th>
          <th className="kc-th">{t("labels.linkedTxn")}</th><th className="kc-th">{t("labels.status")}</th>
          <th className="kc-th">{t("labels.harvestDate")}</th>
        </tr></thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.grievance_id}>
              <td className="kc-td">#{g.grievance_id}</td>
              <td className="kc-td font-medium">{g.farmer_name}</td>
              <td className="kc-td">{t(`cat.${g.category}`)}</td>
              <td className="kc-td max-w-[260px] truncate" title={g.description}>{g.description}</td>
              <td className="kc-td">{g.txn_id ? `#${g.txn_id}` : "—"}</td>
              <td className="kc-td">
                <div className="flex items-center gap-1.5">
                  <StatusChip status={g.status} />
                  <select className="kc-input w-28 py-0.5 text-xs" value={g.status}
                    onChange={(e) => set(g.grievance_id, e.target.value)} aria-label="change status">
                    <option value="OPEN">{t("status.OPEN")}</option>
                    <option value="IN_REVIEW">{t("status.IN_REVIEW")}</option>
                    <option value="RESOLVED">{t("status.RESOLVED")}</option>
                  </select>
                </div>
              </td>
              <td className="kc-td text-xs text-muted">{fmtDate(g.created_at)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="kc-td text-center text-muted">{t("labels.noData")}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
