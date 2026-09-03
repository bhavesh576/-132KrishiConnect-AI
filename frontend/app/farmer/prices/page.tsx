"use client";
import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import PriceChart from "@/components/shared/PriceChart";
import MapPanel from "@/components/shared/MapPanel";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";

const CROPS = ["Onion", "Tomato", "Potato", "Soybean", "Cotton", "Wheat",
  "Grapes", "Pomegranate", "Banana", "Sugarcane", "Gram (Chana)", "Maize"];

function PricesInner() {
  const { t } = useT();
  const [crop, setCrop] = useState("Onion");
  const [mandis, setMandis] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([3, 10]); // Nashik + Aurangabad default
  const [series, setSeries] = useState<any[]>([]);
  const [heat, setHeat] = useState<any>(null);

  useEffect(() => { apiGet("/prices/mandis").then(setMandis); }, []);

  useEffect(() => {
    const mParam = selected.length ? selected.join(",") : "all";
    apiGet(`/prices?crop=${encodeURIComponent(crop)}&mandi=${mParam}&days=90`).then((r) => {
      setSeries(r.series);
      if (!selected.length) setSelected((r.mandis[0] ? [r.mandis[0].mandi_id] : []));
    });
    apiGet(`/prices/heatmap?crop=${encodeURIComponent(crop)}`).then(setHeat);
  }, [crop, selected]);

  const chartMandis = useMemo(
    () => (selected.length ? mandis.filter((m) => selected.includes(m.mandi_id)) : mandis.slice(0, 1)),
    [mandis, selected]);

  const toggleMandi = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 6)));

  const heatPoints = (heat?.points ?? []).map((p: any) => ({
    mandi_name: p.mandi_name, lat: p.lat, lon: p.lon,
    value: p.modal_price_per_qtl,
    sub: `${Math.round(p.arrival_qty_tonnes).toLocaleString("en-IN")} t arrivals`,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="FARMER" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.prices")} · भाव</h1>
      <p className="text-xs text-muted">{t("ui.pricesSubtitle")}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div>
          <label className="kc-label">{t("labels.crop")}</label>
          <select className="kc-input mt-1" value={crop} onChange={(e) => setCrop(e.target.value)}>
            {CROPS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label className="kc-label">{t("labels.mandi")} — multi-select (max 6)</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {mandis.map((m) => (
              <button key={m.mandi_id} onClick={() => toggleMandi(m.mandi_id)}
                className={`rounded-btn border px-2 py-1 text-xs font-medium ${
                  selected.includes(m.mandi_id) ? "border-primary bg-primary text-white" : "border-borderc bg-surface text-muted"
                }`}>
                {m.mandi_name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="kc-card mt-4 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("labels.priceTrend")} · ₹/{t("labels.qtlUnit")}</h3>
        <PriceChart series={series} mandis={chartMandis} />
      </section>

      <section className="kc-card mt-4 p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">{t("labels.priceMap")}</h3>
          {heat?.date && <span className="text-xs text-muted">as of {heat.date}</span>}
        </div>
        <MapPanel points={heatPoints} legend={{ low: t("labels.legendLow"), high: t("labels.legendHigh") }} />
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="FARMER"><PricesInner /></RoleGuard>;
}
