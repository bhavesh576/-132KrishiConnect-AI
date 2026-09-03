"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import LotForm from "@/components/farmer/LotForm";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";
import { getSession } from "@/lib/auth";

function NewLotInner() {
  const { t } = useT();
  const router = useRouter();
  const session = getSession()!;
  const [mandis, setMandis] = useState<any[]>([]);
  const [fpoId, setFpoId] = useState<number | null>(null);

  useEffect(() => {
    apiGet("/prices/mandis").then(setMandis);
    // demo convenience: detect the farmer's FPO via seeded membership lookup
    apiGet(`/fpo/membership/${session.user_id}`).then((r) => setFpoId(r.fpo_id)).catch(() => setFpoId(null));
  }, [session.user_id]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="FARMER" />
      <h1 className="mt-4 text-lg font-bold">{t("common.addNewLot")}</h1>
      <p className="text-xs text-muted">नवीन पीक लॉट — {t("analysis.offerListingHint")}</p>
      <div className="mt-4">
        {mandis.length > 0 && (
          <LotForm mandis={mandis} farmerId={session.user_id} fpoId={fpoId}
            onCreated={(lotId) => router.push(`/farmer/lot/${lotId}/analyze`)} />
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="FARMER"><NewLotInner /></RoleGuard>;
}
