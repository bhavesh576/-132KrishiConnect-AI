"use client";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import ImpactModelCard from "@/components/admin/ImpactModelCard";
import { useT } from "@/components/i18n/LanguageProvider";

function ImpactInner() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-8">
      <SubNav role="ADMIN" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.impact")} · मॉडेल केलेला परिणाम</h1>
      <p className="text-xs text-muted">{t("ui.impactSubtitle")}</p>
      <div className="mt-4">
        <ImpactModelCard />
      </div>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="ADMIN"><ImpactInner /></RoleGuard>;
}
