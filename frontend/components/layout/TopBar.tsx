"use client";
import Link from "next/link";
import { LogOut } from "lucide-react";
import LanguageSwitch from "./LanguageSwitch";
import { useT } from "@/components/i18n/LanguageProvider";
import { clearSession, getSession } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Government-portal chrome: tricolor strip + solid green bar on every page.
export default function TopBar() {
  const { t } = useT();
  const router = useRouter();
  const [session, setSessionState] = useState<ReturnType<typeof getSession>>(null);
  useEffect(() => setSessionState(getSession()), []);

  const logout = () => {
    clearSession();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="tricolor h-[3px] w-full" aria-hidden />
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-baseline gap-3">
            <Link href="/login" className="text-lg font-bold tracking-tight hover:underline">
              KrishiConnect
            </Link>
            <span className="hidden text-[11px] text-white/70 sm:block">{t("tagline")}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <LanguageSwitch />
            {session && (
              <span
                data-testid="role-badge"
                className="rounded-btn border border-white/40 px-2 py-0.5 text-xs font-semibold"
              >
                {t(`role.${session.role}`)}
              </span>
            )}
            {session && (
              <button onClick={logout} title={t("common.logout")} aria-label={t("common.logout")}
                className="rounded-btn border border-white/40 p-1 hover:bg-primary-dark">
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
