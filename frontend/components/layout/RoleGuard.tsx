"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, type Role } from "@/lib/auth";
import { useT } from "@/components/i18n/LanguageProvider";

// Wraps each role's routes; redirects to /login on missing/mismatched role.
export default function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useT();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== role) {
      router.replace("/login");
      return;
    }
    setOk(true);
  }, [role, router]);

  if (!ok) return <div className="p-8 text-sm text-muted">{t("common.loading")}</div>;
  return <>{children}</>;
}
