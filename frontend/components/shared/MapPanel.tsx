"use client";
import dynamic from "next/dynamic";

// Leaflet touches window — load client-side only.
const MapPanel = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="kc-card h-[380px] animate-pulse bg-[#F5F0E4]" />,
});
export default MapPanel;
