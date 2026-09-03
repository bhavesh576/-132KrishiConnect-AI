"use client";
import { useT } from "@/components/i18n/LanguageProvider";

const COLORS: Record<string, string> = {
  // lot
  DRAFT: "border-borderc bg-[#F5F0E4] text-muted",
  LISTED: "border-primary/40 bg-primary/10 text-primary",
  POOLED: "border-secondary/40 bg-secondary/10 text-secondary",
  SOLD: "border-[#3C7A34]/40 bg-[#3C7A34]/10 text-[#3C7A34]",
  // logistics
  ASSIGNED: "border-primary/40 bg-primary/10 text-primary",
  IN_TRANSIT: "border-secondary/40 bg-secondary/10 text-secondary",
  DELIVERED: "border-[#3C7A34]/40 bg-[#3C7A34]/10 text-[#3C7A34]",
  // payment / offer / requirement
  PENDING: "border-borderc bg-[#F5F0E4] text-muted",
  PARTIAL: "border-secondary/40 bg-secondary/10 text-secondary",
  PAID: "border-[#3C7A34]/40 bg-[#3C7A34]/10 text-[#3C7A34]",
  ACCEPTED: "border-[#3C7A34]/40 bg-[#3C7A34]/10 text-[#3C7A34]",
  REJECTED: "border-[#A8432E]/40 bg-[#A8432E]/10 text-[#A8432E]",
  OPEN: "border-primary/40 bg-primary/10 text-primary",
  IN_REVIEW: "border-secondary/40 bg-secondary/10 text-secondary",
  RESOLVED: "border-[#3C7A34]/40 bg-[#3C7A34]/10 text-[#3C7A34]",
  FULFILLED: "border-[#3C7A34]/40 bg-[#3C7A34]/10 text-[#3C7A34]",
};

const KEY: Record<string, string> = {
  DRAFT: "status.DRAFT", LISTED: "status.LISTED", POOLED: "status.POOLED", SOLD: "status.SOLD",
  ASSIGNED: "status.ASSIGNED", IN_TRANSIT: "status.IN_TRANSIT", DELIVERED: "status.DELIVERED",
  PENDING: "status.PENDING", PARTIAL: "status.PARTIAL", PAID: "status.PAID",
  ACCEPTED: "status.ACCEPTED", REJECTED: "status.REJECTED", OPEN: "status.OPEN",
  IN_REVIEW: "status.IN_REVIEW", RESOLVED: "status.RESOLVED",
};

export default function StatusChip({ status }: { status: string }) {
  const { t } = useT();
  return (
    <span className={`kc-chip ${COLORS[status] ?? "border-borderc bg-[#F5F0E4] text-muted"}`}>
      {t(KEY[status] ?? "status.PENDING")}
    </span>
  );
}

export function GradeChip({ grade }: { grade: string }) {
  const map: Record<string, string> = {
    A: "border-[#3C7A34]/50 bg-[#3C7A34]/10 text-[#3C7A34]",
    B: "border-secondary/50 bg-secondary/10 text-secondary",
    C: "border-[#A8432E]/50 bg-[#A8432E]/10 text-[#A8432E]",
  };
  return <span className={`kc-chip ${map[grade] ?? ""}`}>Grade {grade}</span>;
}
