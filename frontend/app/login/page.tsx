"use client";
// Login gateway — deliberately NOT a marketing hero. Plain bordered role cards.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Handshake, Users, ShieldCheck } from "lucide-react";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiPost } from "@/lib/api";
import { setSession, type Role } from "@/lib/auth";

const ROLES: { id: Role; key: string; icon: React.ReactNode; home: string }[] = [
  { id: "FARMER", key: "login.farmer", icon: <Sprout size={22} />, home: "/farmer/dashboard" },
  { id: "BUYER", key: "login.buyer", icon: <Handshake size={22} />, home: "/buyer/dashboard" },
  { id: "FPO", key: "login.fpo", icon: <Users size={22} />, home: "/fpo/dashboard" },
  { id: "ADMIN", key: "login.admin", icon: <ShieldCheck size={22} />, home: "/admin/dashboard" },
];

// Seeded demo accounts for one-click login (phones match seed/generate_registry.py;
// the OTP "1234" is the documented demo OTP from auth.py).
const DEMO_ACCOUNTS: { role: Role; phone: string; label: string; home: string }[] = [
  { role: "FARMER", phone: "9876543210", label: "Ramesh Patil · Nashik", home: "/farmer/dashboard" },
  { role: "BUYER", phone: "9822011111", label: "Shree Ganesh Trading Co.", home: "/buyer/dashboard" },
  { role: "FPO", phone: "9822033333", label: "Nashik Kanda Utpadak FPO", home: "/fpo/dashboard" },
  { role: "ADMIN", phone: "9999999999", label: "KrishiConnect Admin", home: "/admin/dashboard" },
];

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const sendOtp = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await apiPost("/auth/otp/request", { phone });
      if (!r.registered) setErr(t("ui.notRegistered"));
      else setOtpSent(true);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await apiPost<{ jwt: string; role: Role; user_id: number; name: string }>(
        "/auth/otp/verify", { phone, otp });
      if (r.role !== role) throw new Error(`This phone is registered as ${r.role}, not ${role}`);
      setSession({ token: r.jwt, role: r.role, user_id: r.user_id, name: r.name, phone });
      const home = ROLES.find((x) => x.id === role)!.home;
      router.push(home);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  // DEMO BYPASS: same real endpoint, demo OTP auto-filled — no backend changes.
  const quickLogin = async (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setErr(""); setBusy(true);
    try {
      const r = await apiPost<{ jwt: string; role: Role; user_id: number; name: string }>(
        "/auth/otp/verify", { phone: acc.phone, otp: "1234" });
      setSession({ token: r.jwt, role: r.role, user_id: r.user_id, name: r.name, phone: acc.phone });
      router.push(acc.home);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-center text-sm text-muted">{t("psLine")}</p>

      {!role ? (
        <>
          <h1 className="mt-6 text-center text-base font-semibold uppercase tracking-wide text-textc">
            {t("login.chooseRole")} · <span className="text-muted normal-case">भूमिका निवडा</span>
          </h1>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {ROLES.map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className="kc-card flex flex-col items-center gap-2 px-4 py-6 text-center hover:border-primary"
                data-testid={`role-${r.id}`}>
                <span className="text-primary">{r.icon}</span>
                <span className="text-sm font-semibold text-textc">{t(r.key)}</span>
                <span className="text-[11px] text-muted">{t(`role.${r.id}`)}</span>
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted">{t("login.note")}</p>

          {/* DEMO BYPASS — one-click login with seeded accounts (still goes
              through the real /auth/otp/verify endpoint with the demo OTP). */}
          <section className="kc-card mx-auto mt-8 max-w-2xl p-4" data-testid="demo-bypass">
            <h2 className="text-sm font-bold uppercase tracking-wide text-textc">
              {t("login.quickTitle")}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">{t("login.quickHint")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.phone} disabled={busy}
                  onClick={() => quickLogin(a)}
                  className="rounded-btn border border-borderc bg-[#FDFBF5] px-2 py-2 text-left hover:border-primary disabled:opacity-50"
                  data-testid={`quick-${a.role}`}>
                  <span className="block text-xs font-bold text-primary">{t(`role.${a.role}`)} →</span>
                  <span className="block truncate text-[11px] text-textc" title={a.label}>{a.label}</span>
                  <span className="block font-mono text-[10px] text-muted">{a.phone}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="kc-card mx-auto mt-8 max-w-md p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold">{t(ROLES.find((x) => x.id === role)!.key)}</h1>
            <button className="text-xs text-primary underline" onClick={() => { setRole(null); setOtpSent(false); setErr(""); }}>
              {t("login.changeRole")}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="kc-label">{t("login.phone")}</label>
              <input inputMode="numeric" className="kc-input mt-1" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} maxLength={10}
                placeholder="9876543210" />
            </div>
            {!otpSent ? (
              <button className="kc-btn w-full justify-center" disabled={busy || phone.length !== 10} onClick={sendOtp}>
                {t("login.sendOtp")}
              </button>
            ) : (
              <>
                <div>
                  <label className="kc-label">{t("login.otp")}</label>
                  <input inputMode="numeric" className="kc-input mt-1" value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))} maxLength={4}
                    placeholder="••••" />
                  <p className="mt-1 text-[11px] font-semibold text-secondary">{t("login.demoHint")}</p>
                </div>
                <button className="kc-btn w-full justify-center" disabled={busy || otp.length !== 4} onClick={verify}>
                  {t("login.verify")}
                </button>
              </>
            )}
            {err && <p className="text-sm text-danger">{err}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
