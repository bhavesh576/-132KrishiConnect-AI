"use client";
import { useT } from "@/components/i18n/LanguageProvider";

// Persistent honesty footer on every dashboard (Section 0 honesty rules).
export default function FooterDisclaimer() {
  const { t } = useT();
  return (
    <footer className="mt-6 border-t border-borderc bg-surface px-4 py-2.5">
      <p className="mx-auto max-w-7xl text-[11px] leading-snug text-muted">⚠ {t("footer")}</p>
    </footer>
  );
}
