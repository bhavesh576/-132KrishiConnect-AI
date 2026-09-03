"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { inr } from "@/lib/format";

const COLORS = ["#1B5E3A", "#C97B24", "#A8432E", "#3C7A34", "#6B6155", "#123D26"];

// 90-day modal price trend (₹/qtl) for the selected crop across chosen mandis.
export default function PriceChart({
  series,
  mandis,
}: {
  series: { date: string; mandi_id: number; modal_price_per_qtl: number }[];
  mandis: { mandi_id: number; mandi_name: string }[];
}) {
  const byDate: Record<string, any> = {};
  for (const r of series) {
    byDate[r.date] = byDate[r.date] || { date: r.date.slice(5) };
    byDate[r.date][`m${r.mandi_id}`] = r.modal_price_per_qtl;
  }
  const data = Object.values(byDate).sort((a: any, b: any) => (a.date < b.date ? -1 : 1));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#E8E0CE" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} width={62} />
          <Tooltip formatter={(v: any) => inr(Number(v))} labelStyle={{ fontWeight: 600 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {mandis.map((m, i) => (
            <Line
              key={m.mandi_id}
              type="monotone"
              dataKey={`m${m.mandi_id}`}
              name={m.mandi_name}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={1.8}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
