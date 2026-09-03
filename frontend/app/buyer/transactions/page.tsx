"use client";
import { useEffect, useState } from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import StatusChip from "@/components/shared/StatusChip";
import TransactionStepper from "@/components/shared/TransactionStepper";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet, apiPatch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { inr, tonnes, fmtDate } from "@/lib/format";

function BuyerTxnInner() {
  const { t } = useT();
  const session = getSession()!;
  const [txns, setTxns] = useState<any[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const load = () => apiGet(`/transactions/buyer/${session.user_id}`).then(setTxns);
  useEffect(() => { load(); }, [session.user_id]);

  const advance = async (x: any) => {
    const nextLog = ["ASSIGNED", "IN_TRANSIT", "DELIVERED"];
    const li = nextLog.indexOf(x.logistics_status);
    if (li < 2) await apiPatch(`/transactions/${x.txn_id}/status`, { logistics_status: nextLog[li + 1] });
    else if (x.payment_status !== "PAID") await apiPatch(`/transactions/${x.txn_id}/status`, { payment_status: "PAID" });
    load();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="BUYER" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.transactions")} · व्यवहार</h1>
      <section className="kc-card mt-4 p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr>
              <th className="kc-th">#</th><th className="kc-th">{t("labels.crop")}</th>
              <th className="kc-th">{t("labels.qty")}</th>
              <th className="kc-th">{t("labels.price")} (₹/{t("labels.qtlUnit")})</th>
              <th className="kc-th">{t("labels.truckId")}</th>
              <th className="kc-th">{t("labels.logisticsStatus")}</th>
              <th className="kc-th">{t("labels.paymentStatus")}</th>
              <th className="kc-th"></th>
            </tr></thead>
            <tbody>
              {txns.map((x) => (
                <>
                  <tr key={x.txn_id}>
                    <td className="kc-td">#{x.txn_id}</td>
                    <td className="kc-td">{x.crop}</td>
                    <td className="kc-td">{tonnes(x.final_qty_tonnes)}</td>
                    <td className="kc-td font-mono">{inr(x.final_price_per_qtl)}</td>
                    <td className="kc-td font-mono text-xs">{x.truck_id}</td>
                    <td className="kc-td"><StatusChip status={x.logistics_status} /></td>
                    <td className="kc-td"><StatusChip status={x.payment_status} /></td>
                    <td className="kc-td text-right">
                      <button className="kc-btn-outline" onClick={() => setOpen(open === x.txn_id ? null : x.txn_id)}>
                        {open === x.txn_id ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>
                  {open === x.txn_id && (
                    <tr key={`${x.txn_id}-x`}>
                      <td colSpan={8} className="kc-td">
                        <TransactionStepper stages={x.stages} stageIndex={x.stage_index} />
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                          {t("labels.totalInHand")}: <b className="text-textc">{inr(x.order_value)}</b>
                          <span>· {fmtDate(x.created_at)}</span>
                          <button className="kc-btn ml-auto" onClick={() => advance(x)} disabled={x.stage_index >= 4}>
                            {t("common.advance")} →
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {!txns.length && <tr><td colSpan={8} className="kc-td text-center text-muted">{t("labels.noData")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="BUYER"><BuyerTxnInner /></RoleGuard>;
}
