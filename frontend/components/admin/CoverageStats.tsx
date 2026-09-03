"use client";
import { useT } from "@/components/i18n/LanguageProvider";
import MapPanel from "@/components/shared/MapPanel";
import { inrPlain } from "@/lib/format";

// District coverage: Leaflet markers sized by farmer count + district table.
export default function CoverageStats({ data }: { data: any }) {
  const { t } = useT();
  const points = (data?.by_district ?? [])
    .filter((d: any) => d.lat != null)
    .map((d: any) => ({ mandi_name: `${d.district} (${d.farmers})`, lat: d.lat, lon: d.lon,
      value: d.farmers, sub: `${d.buyers} buyers · ${d.fpos} FPOs · ${d.lots} lots` }));

  return (
    <div>
      <MapPanel points={points} legend={{ low: t("labels.legendLow"), high: t("labels.legendHigh") }} />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead><tr>
            <th className="kc-th">{t("labels.district")}</th>
            <th className="kc-th">{t("labels.regFarmers")}</th>
            <th className="kc-th">{t("labels.regBuyers")}</th>
            <th className="kc-th">{t("labels.activeFpos")}</th>
            <th className="kc-th">{t("labels.totalLots")}</th>
          </tr></thead>
          <tbody>
            {(data?.by_district ?? []).slice(0, 16).map((d: any) => (
              <tr key={d.district}>
                <td className="kc-td font-medium">{d.district}</td>
                <td className="kc-td">{inrPlain(d.farmers)}</td>
                <td className="kc-td">{d.buyers}</td>
                <td className="kc-td">{d.fpos}</td>
                <td className="kc-td">{d.lots}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
