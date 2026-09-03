"use client";

// Plain bordered stat card — no gradients, no glassmorphism.
export default function StatCard({
  label,
  sub,
  value,
  icon,
}: {
  label: string;
  sub?: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="kc-card flex items-center gap-3 px-3.5 py-3">
      {icon && <div className="text-primary">{icon}</div>}
      <div>
        <div className="text-xl font-bold leading-tight text-textc">{value}</div>
        <div className="text-xs text-muted">
          {label}
          {sub && <span className="ml-1 text-[11px] text-muted/80">{sub}</span>}
        </div>
      </div>
    </div>
  );
}
