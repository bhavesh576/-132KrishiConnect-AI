"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiPost } from "@/lib/api";
import { todayStr } from "@/lib/format";

export interface MandiMeta { mandi_id: number; mandi_name: string; district: string }

const CROPS = ["Onion", "Tomato", "Potato", "Soybean", "Cotton", "Wheat",
  "Grapes", "Pomegranate", "Banana", "Sugarcane", "Gram (Chana)", "Maize"];

// Harvest lot form. Harvest date defaults to TODAY (bug fix called out in spec)
// and is computed at render, never hardcoded.
export default function LotForm({
  mandis,
  farmerId,
  fpoId,
  onCreated,
}: {
  mandis: MandiMeta[];
  farmerId: number;
  fpoId: number | null;
  onCreated: (lotId: number) => void;
}) {
  const { t, tc } = useT();
  const [crop, setCrop] = useState("Onion");
  const [qty, setQty] = useState("5");
  const [grade, setGrade] = useState("A");
  const [harvest, setHarvest] = useState(todayStr()); // ← today, not a frozen date
  const [storage, setStorage] = useState(true);
  const [cashNeed, setCashNeed] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashBy, setCashBy] = useState("");
  const [mandiId, setMandiId] = useState(mandis.find((m) => m.mandi_name === "Nashik")?.mandi_id ?? mandis[0]?.mandi_id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await apiPost<{ lot_id: number }>("/lots", {
        farmer_id: farmerId, fpo_id: fpoId, crop,
        quantity_tonnes: Number(qty), grade,
        harvest_date: harvest,
        storage_available: storage,
        cash_need_amount: cashNeed ? Number(cashAmount) : null,
        cash_need_by_date: cashNeed && cashBy ? cashBy : null,
        current_location_mandi_id: mandiId,
      });
      onCreated(res.lot_id);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="kc-card mx-auto max-w-2xl p-5">
      <div className="space-y-4">
        <div>
          <label className="kc-label">{t("labels.crop")}</label>
          <span className="kc-label-bi">{t("formBi.crop")}</span>
          <select className="kc-input mt-1" value={crop} onChange={(e) => setCrop(e.target.value)}>
            {CROPS.map((c) => <option key={c} value={c}>{c} · {tc(c)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="kc-label">{t("labels.quantityTonnes")}</label>
            <span className="kc-label-bi">{t("formBi.quantity")}</span>
            <input type="number" min="0.1" step="0.1" required className="kc-input mt-1"
              value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className="kc-label">{t("labels.grade")}</label>
            <span className="kc-label-bi">{t("formBi.grade")}</span>
            <div className="mt-1 flex gap-1.5" role="radiogroup" aria-label={t("labels.grade")}>
              {["A", "B", "C"].map((g) => (
                <button type="button" key={g} role="radio" aria-checked={grade === g}
                  onClick={() => setGrade(g)}
                  className={`rounded-btn border px-3 py-1.5 text-sm font-semibold ${
                    grade === g ? "border-primary bg-primary text-white" : "border-borderc bg-surface text-muted"
                  }`}>
                  {t(`grades.${g}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="kc-label">{t("labels.harvestDate")}</label>
            <span className="kc-label-bi">{t("formBi.harvestDate")}</span>
            <input type="date" required className="kc-input mt-1"
              value={harvest} onChange={(e) => setHarvest(e.target.value)} />
          </div>
          <div>
            <label className="kc-label">{t("labels.currentMandi")}</label>
            <span className="kc-label-bi">{t("formBi.mandi")}</span>
            <select className="kc-input mt-1" value={mandiId}
              onChange={(e) => setMandiId(Number(e.target.value))}>
              {mandis.map((m) => <option key={m.mandi_id} value={m.mandi_id}>{m.mandi_name} ({m.district})</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-card border border-borderc px-3 py-2">
          <div>
            <span className="kc-label">{t("labels.storageAvailable")}</span>
            <span className="kc-label-bi">{t("formBi.storage")}</span>
          </div>
          <Toggle on={storage} setOn={setStorage} onLabel={t("labels.on")} offLabel={t("labels.off")} />
        </div>
        <div className="rounded-card border border-borderc px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="kc-label">{t("labels.cashNeed")}</span>
              <span className="kc-label-bi">{t("formBi.cashNeed")}</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={cashNeed} onChange={(e) => setCashNeed(e.target.checked)} />
              {cashNeed ? "Yes" : "No"}
            </label>
          </div>
          {cashNeed && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="kc-label">{t("labels.cashAmount")}</label>
                <input type="number" min="0" step="100" className="kc-input mt-1" value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)} required />
              </div>
              <div>
                <label className="kc-label">{t("labels.cashNeededBy")}</label>
                <input type="date" className="kc-input mt-1" value={cashBy}
                  onChange={(e) => setCashBy(e.target.value)} required />
              </div>
            </div>
          )}
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
      <button type="submit" disabled={busy} className="kc-btn mt-4 w-full justify-center py-2">
        {busy ? t("common.loading") : t("common.analyze") + " →"}
      </button>
    </form>
  );
}

export function Toggle({
  on, setOn, onLabel, offLabel,
}: {
  on: boolean; setOn: (v: boolean) => void; onLabel?: string; offLabel?: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => setOn(!on)}
      className={`flex items-center gap-1.5 rounded-btn border px-2 py-1 text-xs font-semibold ${
        on ? "border-[#3C7A34] bg-[#3C7A34]/10 text-[#3C7A34]" : "border-[#A8432E] bg-[#A8432E]/10 text-[#A8432E]"
      }`}>
      <span className={`inline-block h-3 w-6 rounded-full border relative ${on ? "bg-[#3C7A34] border-[#3C7A34]" : "bg-[#A8432E] border-[#A8432E]"}`}>
        <span className={`absolute top-0.5 h-2 w-2 rounded-full bg-white transition-all ${on ? "left-3.5" : "left-0.5"}`} />
      </span>
      {on ? onLabel ?? "ON" : offLabel ?? "OFF"}
    </button>
  );
}
