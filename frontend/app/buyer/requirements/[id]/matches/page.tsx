"use client";
// Matches page — the second most important screen. Honest shortfall handling.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import StatusChip from "@/components/shared/StatusChip";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet, apiPost } from "@/lib/api";
import { tonnes, km, fmtDate } from "@/lib/format";

interface MatchRow {
  lot_id: number; farmer_id: number; fpo_id: number | null; grade: string;
  matched_tonnes: number; source_type: "FARMER" | "FPO_POOL"; distance_km: number;
  farmer_name: string; fpo_name?: string | null;
}

function MatchesInner() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const reqId = Number(params.id);
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setData(await apiGet(`/requirements/${reqId}/matches`));
  }, [reqId]);
  useEffect(() => { load().catch(console.error); }, [load]);

  if (!data) return <div className="p-8 text-sm text-muted">{t("common.loading")}</div>;
  const req = data.requirement;
  const matches: MatchRow[] = data.matches;
  const matchedPct = req.quantity_tonnes > 0
    ? Math.min(100, (data.matched_tonnes / req.quantity_tonnes) * 100) : 0;

  const buyerId = () =>
    Number(JSON.parse(localStorage.getItem("kc_session") || "{}").user_id ?? 0);

  const sendOffer = async (lotId: number, qty?: number) => {
    setBusy(true);
    try {
      const price = Number(prompt(t("ui.offerPricePrompt"), "2800") ?? 0);
      const row = matches.find((m) => m.lot_id === lotId)!;
      await apiPost("/offers", {
        lot_id: lotId, buyer_id: buyerId(),
        offered_price_per_qtl: price, offered_qty_tonnes: qty ?? row.matched_tonnes,
      });
      setMsg("✔ Offer sent");
      load();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const sendAll = async () => {
    setBusy(true);
    try {
      const price = Number(prompt(t("ui.offerPricePromptAll"), "2800") ?? 0);
      for (const m of matches) {
        await apiPost("/offers", {
          lot_id: m.lot_id, buyer_id: buyerId(),
          offered_price_per_qtl: price, offered_qty_tonnes: m.matched_tonnes,
        });
      }
      setMsg(`✔ ${matches.length} offers sent`);
      load();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="BUYER" />
      <h1 className="mt-4 text-lg font-bold">{t("labels.requirementSummary")} · मागणीचा सारांश</h1>
      <p className="mt-0.5 text-sm text-muted">
        #{req.req_id} — <b className="text-textc">{req.crop}</b> · {tonnes(req.quantity_tonnes)} ·
        {" "}{t("labels.minGrade")} {req.grade} · {req.destination_district} ·
        {" "}{t("labels.deadlineDate")}: {fmtDate(req.deadline_date)}
      </p>

      {/* running total bar */}
      <section className="kc-card mt-4 p-4" data-testid="match-progress">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">{t("labels.matchedOf")}: {data.matched_tonnes} / {req.quantity_tonnes} t</span>
          <span className="text-xs text-muted">{matchedPct.toFixed(0)}%</span>
        </div>
        <div className="mt-2 h-3.5 w-full overflow-hidden rounded-card border border-borderc bg-[#F5F0E4]">
          <div className={`h-full ${data.shortfall_tonnes > 0 ? "bg-secondary" : "bg-[#3C7A34]"}`}
            style={{ width: `${matchedPct}%` }} />
        </div>
        {data.shortfall_tonnes > 0 ? (
          <p className="mt-2 rounded-card border border-danger bg-[#A8432E]/10 px-3 py-2 text-sm font-semibold text-danger" data-testid="shortfall">
            {t("labels.shortfall")}: {data.shortfall_tonnes} {t("labels.tonnesUnit")} {t("labels.noSupply")}
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold text-[#3C7A34]">✔ {t("labels.matchedOf")}: 100%</p>
        )}
      </section>

      <section className="kc-card mt-4 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide">{data.matches.length} {t("ui.matchedRows")}</h3>
          <button className="kc-btn" disabled={busy || !matches.length} onClick={sendAll}>
            {t("common.sendOfferAll")}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]" data-testid="matches-table">
            <thead><tr>
              <th className="kc-th">{t("labels.farmer")} / FPO</th>
              <th className="kc-th">{t("labels.fpoPool")}</th>
              <th className="kc-th">{t("labels.qty")}</th>
              <th className="kc-th">{t("labels.distance")}</th>
              <th className="kc-th">{t("labels.grade")}</th>
              <th className="kc-th"></th>
            </tr></thead>
            <tbody>
              {matches.map((m) => (
                <tr key={`${m.lot_id}-${m.source_type}`}>
                  <td className="kc-td font-medium">
                    {m.source_type === "FPO_POOL" ? (m.fpo_name ?? "FPO") : m.farmer_name}
                    <Link className="ml-1.5 text-[11px] text-primary underline" href={`/farmer/lot/${m.lot_id}/analyze`}>
                      lot #{m.lot_id}
                    </Link>
                  </td>
                  <td className="kc-td">
                    <span className={`kc-chip ${m.source_type === "FPO_POOL"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-borderc bg-[#F5F0E4] text-muted"}`}>
                      {m.source_type === "FPO_POOL" ? t("labels.fpoPool") : t("labels.farmer")}
                    </span>
                  </td>
                  <td className="kc-td">{tonnes(m.matched_tonnes)}</td>
                  <td className="kc-td">{km(m.distance_km)}</td>
                  <td className="kc-td">{m.grade}</td>
                  <td className="kc-td text-right">
                    <button className="kc-btn-outline" disabled={busy} onClick={() => sendOffer(m.lot_id)}>
                      {t("common.sendOffer")}
                    </button>
                  </td>
                </tr>
              ))}
              {!matches.length && <tr><td colSpan={6} className="kc-td text-center text-muted">{t("labels.noData")}</td></tr>}
            </tbody>
          </table>
        </div>
        {msg && <p className="mt-2 text-sm font-semibold text-[#3C7A34]">{msg}</p>}
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="BUYER"><MatchesInner /></RoleGuard>;
}
