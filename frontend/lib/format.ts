// Indian-numbering currency & unit formatting (₹1,24,500 — never ₹124,500)
const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const inr = (n: number | null | undefined, decimals = false): string =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : `₹${decimals ? inrFmt2.format(n) : inrFmt.format(Math.round(n))}`;

export const inrPlain = (n: number | null | undefined): string =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : inrFmt.format(Math.round(n));

export const tonnes = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${inrFmt2.format(n)} t`;

export const qtl = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${inrFmt2.format(n)} qtl`;

export const km = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${inrFmt2.format(n)} km`;

export const pct = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${inrFmt2.format(n)}%`;

// Local-date helpers — MUST match the backend's Python date.today(), which
// reads the machine's LOCAL date. (The previous toISOString().slice(0,10)
// implementation returned the UTC date, which diverges from local between
// 00:00 and 05:30 in IST — a demo-day hazard when both run on one laptop.)
export const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayStr = (): string => localDateStr(new Date());

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
