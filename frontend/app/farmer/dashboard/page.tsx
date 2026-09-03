"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sprout, IndianRupee, AlertTriangle, Scale } from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import StatCard from "@/components/shared/StatCard";
import StatusChip, { GradeChip } from "@/components/shared/StatusChip";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet, apiPost } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { inr, tonnes, fmtDate } from "@/lib/format";

interface Lot { lot_id: number; crop: string; quantity_tonnes: number; grade: string;
  harvest_date: string; status: string; mandi_name?: string; district?: string }
interface Offer { offer_id: number; lot_id: number; buyer_name: string; buyer_type: string;
  crop: string; offered_price_per_qtl: number; offered_qty_tonnes: number; status: string }

function FarmerDashboardInner() {
  const { t, tc } = useT();
  const router = useRouter();
  const session = getSession()!;
  const [lots, setLots] = useState<Lot[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [grievances, setGrievances] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLots(await apiGet(`/lots/farmer/${session.user_id}`));
    setOffers(await apiGet(`/offers/farmer/${session.user_id}`));
    setGrievances(await apiGet(`/grievance?farmer_id=${session.user_id}`));
    setTxns(await apiGet(`/transactions/farmer/${session.user_id}`));
  }, [session.user_id]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const pendingOffers = offers.filter((o) => o.status === "PENDING");
  const stats = {
    activeLots: lots.filter((l) => l.status !== "SOLD").length,
    tonnesListed: lots.filter((l) => l.status === "LISTED" || l.status === "POOLED")
      .reduce((s, l) => s + l.quantity_tonnes, 0),
    openOffers: pendingOffers.length,
    pendingGrievances: grievances.filter((g) => g.status !== "RESOLVED").length,
  };

  const decide = async (offerId: number, action: "accept" | "reject") => {
    await apiPost(`/offers/${offerId}/${action}`);
    load();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="FARMER" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{session.name} · {t("nav.dashboard")}</h1>
          <p className="text-xs text-muted">{t("nav.dashboard")} · डॅशबोर्ड</p>
        </div>
        <Link href="/farmer/lot/new" className="kc-btn" data-testid="add-lot">{t("common.addNewLot")}</Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("labels.activeLots")} sub="सक्रिय लॉट" value={stats.activeLots} icon={<Sprout size={20} />} />
        <StatCard label={t("labels.tonnesListed")} sub="नोंदलेले टन" value={tonnes(stats.tonnesListed)} icon={<Scale size={20} />} />
        <StatCard label={t("labels.openOffers")} sub="खुल्या ऑफर" value={stats.openOffers} icon={<IndianRupee size={20} />} />
        <StatCard label={t("labels.pendingGrievances")} sub="प्रलंबित तक्रारी" value={stats.pendingGrievances} icon={<AlertTriangle size={20} />} />
      </div>

      {pendingOffers.length > 0 && (
        <section className="kc-card mt-4 p-4" data-testid="offers-panel">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("labels.incomingOffers")} · मिळालेल्या ऑफर</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead><tr>
                <th className="kc-th">{t("labels.crop")}</th><th className="kc-th">{t("labels.buyer")}</th>
                <th className="kc-th">{t("labels.price")} (₹/{t("labels.qtlUnit")})</th><th className="kc-th">{t("labels.qty")}</th>
                <th className="kc-th">{t("labels.status")}</th><th className="kc-th"></th>
              </tr></thead>
              <tbody>
                {pendingOffers.map((o) => (
                  <tr key={o.offer_id}>
                    <td className="kc-td">{o.crop}</td>
                    <td className="kc-td">{o.buyer_name} <span className="text-[11px] text-muted">({o.buyer_type})</span></td>
                    <td className="kc-td font-mono">{inr(o.offered_price_per_qtl)}</td>
                    <td className="kc-td">{tonnes(o.offered_qty_tonnes)}</td>
                    <td className="kc-td"><StatusChip status={o.status} /></td>
                    <td className="kc-td text-right">
                      <button className="kc-btn mr-1.5" onClick={() => decide(o.offer_id, "accept")}>{t("common.accept")}</button>
                      <button className="kc-btn-danger" onClick={() => decide(o.offer_id, "reject")}>{t("common.reject")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="kc-card mt-4 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("labels.myLots")} · माझी लॉट</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]" data-testid="lots-table">
            <thead><tr>
              <th className="kc-th">{t("labels.crop")}</th><th className="kc-th">{t("labels.quantityTonnes")}</th>
              <th className="kc-th">{t("labels.grade")}</th><th className="kc-th">{t("labels.harvestDate")}</th>
              <th className="kc-th">{t("labels.mandi")}</th><th className="kc-th">{t("labels.status")}</th>
              <th className="kc-th"></th>
            </tr></thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.lot_id}>
                  <td className="kc-td font-medium">{l.crop} <span className="text-[11px] text-muted">{tc(l.crop)}</span></td>
                  <td className="kc-td">{tonnes(l.quantity_tonnes)}</td>
                  <td className="kc-td"><GradeChip grade={l.grade} /></td>
                  <td className="kc-td">{fmtDate(l.harvest_date)}</td>
                  <td className="kc-td">{l.mandi_name ?? "—"}</td>
                  <td className="kc-td"><StatusChip status={l.status} /></td>
                  <td className="kc-td text-right">
                    <Link href={`/farmer/lot/${l.lot_id}/analyze`} className="kc-btn-outline">{t("common.analyze")}</Link>
                  </td>
                </tr>
              ))}
              {!lots.length && <tr><td className="kc-td text-center text-muted" colSpan={7}>{t("labels.noData")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {txns.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {txns.length} {t("nav.transactions").toLowerCase()} → <Link className="text-primary underline" href="/farmer/transactions">{t("nav.transactions")}</Link>
        </p>
      )}
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="FARMER"><FarmerDashboardInner /></RoleGuard>;
}
