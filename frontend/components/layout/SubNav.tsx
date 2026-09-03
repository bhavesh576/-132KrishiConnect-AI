"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/LanguageProvider";
import type { Role } from "@/lib/auth";

const NAV: Record<Role, { href: string; key: string }[]> = {
  FARMER: [
    { href: "/farmer/dashboard", key: "nav.dashboard" },
    { href: "/farmer/buyers", key: "nav.buyers" },
    { href: "/farmer/transactions", key: "nav.transactions" },
    { href: "/farmer/prices", key: "nav.prices" },
    { href: "/farmer/grievance", key: "nav.grievance" },
  ],
  BUYER: [
    { href: "/buyer/dashboard", key: "nav.dashboard" },
    { href: "/buyer/offers", key: "nav.offers" },
    { href: "/buyer/transactions", key: "nav.transactions" },
  ],
  FPO: [
    { href: "/fpo/dashboard", key: "nav.dashboard" },
    { href: "/fpo/pool-simulator", key: "nav.poolSimulator" },
    { href: "/fpo/requirements", key: "nav.requirementsAvail" },
  ],
  ADMIN: [
    { href: "/admin/dashboard", key: "nav.dashboard" },
    { href: "/admin/grievances", key: "nav.grievances" },
    { href: "/admin/impact", key: "nav.impact" },
  ],
};

// Role desk tab navigation (active tab highlighted).
export default function SubNav({ role }: { role: Role }) {
  const { t } = useT();
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-borderc bg-surface px-4 pt-2 shadow-subtle" aria-label="Desk navigation">
      {NAV[role].map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-t-btn border border-b-0 px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "border-borderc bg-bg text-primary"
                : "border-transparent text-muted hover:text-primary"
            }`}
          >
            {t(n.key)}
          </Link>
        );
      })}
    </nav>
  );
}
