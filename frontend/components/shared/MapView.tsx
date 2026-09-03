"use client";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useT } from "@/components/i18n/LanguageProvider";

export interface MapPoint {
  mandi_name: string;
  lat: number;
  lon: number;
  value: number;
  sub?: string;
}

// Color scale by value quintile: low = pale green → high = rust (price heat).
export function colorFor(t: number): string {
  const stops = ["#3C7A34", "#7A8A3A", "#C97B24", "#B45E24", "#A8432E"];
  return stops[Math.min(stops.length - 1, Math.max(0, Math.floor(t * stops.length)))];
}

// Maharashtra mandi markers, color-coded by value (Leaflet + OSM tiles).
// Note: map tiles load from OpenStreetMap — requires internet at view time.
export default function MapView({
  points,
  legend,
  center = [19.6, 75.6],
  zoom = 6,
}: {
  points: MapPoint[];
  legend?: { low: string; high: string };
  center?: [number, number];
  zoom?: number;
}) {
  const values = points.map((p) => p.value).filter((v) => Number.isFinite(v));
  const min = Math.min(...values), max = Math.max(...values);
  const norm = (v: number) => (max > min ? (v - min) / (max - min) : 0.5);
  const { t } = useT();

  const icon = (color: string, size: number) =>
    L.divIcon({
      className: "",
      html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;
             background:${color};border:2px solid #FFFFFF;box-shadow:0 0 0 1px rgba(0,0,0,.25);"></span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

  return (
    <div>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false}
        style={{ height: 380, width: "100%", border: "1px solid #D8CFBC", borderRadius: 6 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => {
          const t = norm(p.value);
          return (
            <Marker key={p.mandi_name} position={[p.lat, p.lon]}
              icon={icon(colorFor(t), 14 + t * 16)}>
              <Tooltip direction="top" offset={[0, -6]}>
                <b>{p.mandi_name}</b>
                <br />₹{Math.round(p.value).toLocaleString("en-IN")} /qtl{p.sub ? <><br />{p.sub}</> : null}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
      {legend && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
          <span>{legend.low}</span>
          <span className="inline-flex gap-0.5">
            {["#3C7A34", "#7A8A3A", "#C97B24", "#B45E24", "#A8432E"].map((c) => (
              <span key={c} className="inline-block h-2.5 w-5" style={{ background: c }} />
            ))}
          </span>
          <span>{legend.high}</span>
          <span className="ml-2">{t("ui.tilesNote")}</span>
        </div>
      )}
    </div>
  );
}
