"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import BuyerRankedList from "@/components/farmer/BuyerRankedList";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet, apiPost } from "@/lib/api";
import { inr } from "@/lib/format";

interface Lot { lot_id: number; crop: string; grade: string; quantity_tonnes: number }

function BuyersInner() {
  const { t } = useT();
  const search = useSearchParams();
  const lotId = Number(search.get("lot_id") || 0);
  const [lot, setLot] = useState<Lot | null>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!lotId) { setBuyers([]); return; }
    const [l, ranked] = await Promise.all([
      apiGet<Lot>(`/lots/${lotId}`),
      apiGet<any[]>(`/buyers?lot_id=${lotId}`),
    ]);
    setLot(l);
    setBuyers(ranked);
  }, [lotId]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const sendOffer = async (b: any) => {
    if (!lot) return;
    await apiPost("/offers", {
      lot_id: lot.lot_id, buyer_id: b.buyer_id,
      offered_price_per_qtl: Number(prompt(t("ui.offerPricePrompt"), "2800") ?? 0),
      offered_qty_tonnes: lot.quantity_tonnes,
    });
    setMsg(`✔ Offer sent to ${b.name}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="FARMER" />
      <h1 className="mt-4 text-lg font-bold">{t("labels.rankedBuyers")} · क्रमवार खरेदीदार</h1>
      {lot ? (
        <p className="text-xs text-muted">
          {t("labels.lot")} #{lot.lot_id}: {lot.crop} · {lot.quantity_tonnes} t · Grade {lot.grade}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">{t("ui.needLotContext")}</p>
      )}
      {msg && <p className="mt-2 text-sm font-semibold text-[#3C7A34]">{msg}</p>}
      <div className="mt-4">
        <BuyerRankedList buyers={buyers} onSendOffer={sendOffer} />
      </div>
      {buyers.length > 0 && (
        <p className="mt-3 text-[11px] text-muted">
          Weighted criteria — transparent (crop 30% · qty fit 15% · quality 20% · distance 15% · payment 20%). Each card shows its exact formula.
        </p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RoleGuard role="FARMER">
      <Suspense>
        <BuyersInner />
      </Suspense>
    </RoleGuard>
  );
}
