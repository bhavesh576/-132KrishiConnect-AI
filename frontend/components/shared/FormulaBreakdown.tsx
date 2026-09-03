"use client";
import { useT } from "@/components/i18n/LanguageProvider";

// THE "show your work" component (Section 0 core principle): prints the
// literal line-by-line arithmetic behind any number on screen.
export default function FormulaBreakdown({
  lines,
  title,
  defaultOpen = false,
}: {
  lines: string[];
  title?: string;
  defaultOpen?: boolean;
}) {
  const { t } = useT();
  return (
    <details
      open={defaultOpen}
      className="rounded-card border border-borderc bg-[#FDFBF5] px-3 py-2 open:pb-3"
    >
      <summary className="cursor-pointer select-none text-xs font-semibold text-primary">
        =  {title ?? t("common.showFormula")}
      </summary>
      <div className="mt-2 space-y-1 border-l-2 border-primary/30 pl-3">
        {lines.map((l, i) => (
          <p key={i} className="font-mono text-[12px] leading-relaxed text-textc whitespace-pre-wrap">
            {l}
          </p>
        ))}
      </div>
    </details>
  );
}
