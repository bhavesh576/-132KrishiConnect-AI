"use client";
import { useT } from "@/components/i18n/LanguageProvider";
import { tonnes } from "@/lib/format";

// FPO member table: farmer, village, active lots, total tonnes contributed.
export default function MemberList({ members }: { members: any[] }) {
  const { t } = useT();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead><tr>
          <th className="kc-th">{t("labels.farmer")} · शेतकरी</th>
          <th className="kc-th">{t("labels.village")}</th>
          <th className="kc-th">{t("labels.district")}</th>
          <th className="kc-th">{t("labels.activeLotsCol")}</th>
          <th className="kc-th">{t("labels.totalTonnes")}</th>
        </tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.farmer_id}>
              <td className="kc-td font-medium">{m.name}</td>
              <td className="kc-td">{m.village}</td>
              <td className="kc-td">{m.district}</td>
              <td className="kc-td">{m.active_lots}</td>
              <td className="kc-td">{tonnes(m.total_tonnes)}</td>
            </tr>
          ))}
          {!members.length && <tr><td colSpan={5} className="kc-td text-center text-muted">{t("labels.noData")}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
