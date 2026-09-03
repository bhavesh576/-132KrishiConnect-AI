"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiPost } from "@/lib/api";

const CATEGORIES = ["Payment delay", "Quality dispute", "Weighing dispute", "Other"];

export default function GrievanceForm({
  farmerId,
  txns,
  onCreated,
}: {
  farmerId: number;
  txns: { txn_id: number; crop: string; buyer_name: string; truck_id: string }[];
  onCreated: () => void;
}) {
  const { t } = useT();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [txnId, setTxnId] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      await apiPost("/grievance", {
        farmer_id: farmerId, category, description,
        txn_id: txnId ? Number(txnId) : null,
      });
      setDescription(""); setTxnId("");
      setMsg(t("ui.submitted"));
      onCreated();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="kc-card p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">
        {t("nav.grievance")} · तक्रार <span className="ml-1 normal-case text-[10px] font-normal text-muted">(alert-triangle: prototype form, no live ticketing)</span>
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="kc-label">{t("labels.category")}</label>
          <select className="kc-input mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="kc-label">{t("labels.linkedTxn")}</label>
          <select className="kc-input mt-1" value={txnId} onChange={(e) => setTxnId(e.target.value)}>
            <option value="">—</option>
            {txns.map((x) => (
              <option key={x.txn_id} value={x.txn_id}>
                #{x.txn_id} · {x.crop} · {x.buyer_name} · {x.truck_id}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="kc-label">{t("labels.description")}</label>
        <textarea rows={3} required className="kc-input mt-1" value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={busy} className="kc-btn">{busy ? t("common.loading") : t("common.submit")}</button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </form>
  );
}
