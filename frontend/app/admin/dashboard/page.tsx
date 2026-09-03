"use client";
import { useEffect, useState } from "react";
import { Sprout, Handshake, Users, Boxes } from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import SubNav from "@/components/layout/SubNav";
import StatCard from "@/components/shared/StatCard";
import CoverageStats from "@/components/admin/CoverageStats";
import ImpactModelCard from "@/components/admin/ImpactModelCard";
import { useT } from "@/components/i18n/LanguageProvider";
import { apiGet } from "@/lib/api";
import { inrPlain } from "@/lib/format";

function AdminDashboardInner() {
  const { t } = useT();
  const [coverage, setCoverage] = useState<any>(null);
  useEffect(() => { apiGet("/admin/coverage").then(setCoverage); }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <SubNav role="ADMIN" />
      <h1 className="mt-4 text-lg font-bold">{t("nav.dashboard")} · प्रशासक</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("labels.regFarmers")} value={inrPlain(coverage?.totals.farmers ?? 0)} icon={<Sprout size={20} />} />
        <StatCard label={t("labels.regBuyers")} value={inrPlain(coverage?.totals.buyers ?? 0)} icon={<Handshake size={20} />} />
        <StatCard label={t("labels.activeFpos")} value={inrPlain(coverage?.totals.fpos ?? 0)} icon={<Users size={20} />} />
        <StatCard label={t("labels.totalLots")} value={inrPlain(coverage?.totals.lots ?? 0)} icon={<Boxes size={20} />} />
      </div>

      <section className="kc-card mt-4 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("ui.coverageTitle")}</h3>
        <CoverageStats data={coverage} />
      </section>

      <section className="mt-4">
        <ImpactModelCard compact />
      </section>
    </div>
  );
}

export default function Page() {
  return <RoleGuard role="ADMIN"><AdminDashboardInner /></RoleGuard>;
}
