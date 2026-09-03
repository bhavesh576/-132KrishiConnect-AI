"use client";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import PoolSimulatorForm from "@/components/fpo/PoolSimulatorForm";
import { useT } from "@/components/i18n/LanguageProvider";
import { getSession } from "@/lib/auth";

function PoolSimInner() {
  const { t } = useT();
  const session = getSession()!;
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="FPO" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.poolSimulator")}</h1>
      <p className="text-xs text-muted">{t("ui.poolSubtitle")}</p>
      <div className="mt-4">
        <PoolSimulatorForm fpoId={session.user_id} />
      </div>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="FPO"><PoolSimInner /></RoleGuard>;
}
