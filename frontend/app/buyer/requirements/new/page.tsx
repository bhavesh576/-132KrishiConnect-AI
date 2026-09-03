"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet, apiPost } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { todayStr, fmtDate, localDateStr } from "@/lib/format";

const CROPS = ["Onion", "Tomato", "Potato", "Soybean", "Cotton", "Wheat",
  "Grapes", "Pomegranate", "Banana", "Sugarcane", "Gram (Chana)", "Maize"];

function NewRequirementInner() {
  const { t, tc } = useT();
  const router = useRouter();
  const session = getSession()!;
  const [crop, setCrop] = useState("Onion");
  const [qty, setQty] = useState("10");
  const [grade, setGrade] = useState("A");
  const [district, setDistrict] = useState("Pune");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    apiGet("/prices/mandis").then((ms) => {
      const ds = Array.from(new Set<string>(ms.map((m: any) => m.district)));
      setDistricts(ds);
      setDeadline(localDateStr(new Date(Date.now() + 2 * 864e5))); // default +48h, LOCAL date
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await apiPost<{ req_id: number }>("/requirements", {
        buyer_id: session.user_id, crop, quantity_tonnes: Number(qty), grade,
        destination_district: district, deadline_date: deadline,
      });
      router.push(`/buyer/requirements/${r.req_id}/matches`);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="BUYER" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.postRequirement")}</h1>
      <form onSubmit={submit} className="kc-card mx-auto mt-4 max-w-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="kc-label">{t("labels.crop")}</label>
            <select className="kc-input mt-1" value={crop} onChange={(e) => setCrop(e.target.value)}>
              {CROPS.map((c) => <option key={c}>{c} · {tc(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="kc-label">{t("labels.quantityTonnes")}</label>
            <input type="number" min="0.1" step="0.1" required className="kc-input mt-1"
              value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className="kc-label">{t("labels.minGrade")}</label>
            <div className="mt-1 flex gap-1.5">
              {["A", "B", "C"].map((g) => (
                <button type="button" key={g} onClick={() => setGrade(g)}
                  className={`rounded-btn border px-3 py-1.5 text-sm font-semibold ${
                    grade === g ? "border-primary bg-primary text-white" : "border-borderc bg-surface text-muted"
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="kc-label">{t("labels.destinationDistrict")}</label>
            <select className="kc-input mt-1" value={district} onChange={(e) => setDistrict(e.target.value)}>
              {districts.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="kc-label">{t("labels.deadlineDate")}</label>
            <input type="date" required className="kc-input mt-1" min={todayStr()}
              value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            {deadline && (
              <p className="mt-1 text-[11px] text-muted">
                {t("ui.chosenDate")}: <b className="text-textc">{fmtDate(deadline)}</b>
              </p>
            )}
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        <button type="submit" disabled={busy} className="kc-btn mt-5 w-full justify-center py-2">
          {busy ? t("common.loading") : `${t("common.submit")} → ${t("common.analyze")}`}
        </button>
      </form>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="BUYER"><NewRequirementInner /></RoleGuard>;
}
