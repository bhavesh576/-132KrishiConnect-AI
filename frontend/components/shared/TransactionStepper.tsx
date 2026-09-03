"use client";
import { useT } from "@/components/i18n/LanguageProvider";
import { Check } from "lucide-react";

// Horizontal prototype status stepper: Offer Accepted → Truck Assigned →
// In Transit → Delivered → Payment Released (clearly labelled prototype).
export default function TransactionStepper({
  stages,
  stageIndex,
}: {
  stages: string[];
  stageIndex: number;
}) {
  const { t } = useT();
  return (
    <div className="rounded-card border border-borderc bg-[#FDFBF5] p-3">
      <ol className="flex flex-wrap items-center gap-y-2">
        {stages.map((s, i) => {
          const done = i <= stageIndex;
          const current = i === stageIndex;
          return (
            <li key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                    done ? "border-[#3C7A34] bg-[#3C7A34] text-white" : "border-borderc bg-surface text-muted"
                  } ${current ? "ring-2 ring-[#3C7A34]/30" : ""}`}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? <Check size={13} /> : i + 1}
                </span>
                <span className={`mt-0.5 w-24 text-center text-[10px] leading-tight ${done ? "font-semibold text-textc" : "text-muted"}`}>
                  {t(`stage.${s}`)}
                </span>
              </div>
              {i < stages.length - 1 && (
                <span className={`mx-1 mb-4 h-0.5 w-6 sm:w-10 ${i < stageIndex ? "bg-[#3C7A34]" : "bg-borderc"}`} />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-[10px] text-muted">{t("ui.stepperNote")}</p>
    </div>
  );
}
