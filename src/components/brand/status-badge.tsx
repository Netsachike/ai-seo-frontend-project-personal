"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export const statuses = ["live", "published", "scheduled", "draft", "needsApproval", "failed"] as const;
export type Status = (typeof statuses)[number];

const styles: Record<Status, { chip: string; dot: string }> = {
  live: { chip: "bg-success-bg text-success", dot: "bg-success" },
  published: { chip: "bg-success-bg text-success", dot: "bg-success" },
  scheduled: { chip: "bg-blue-bg text-blue-ink", dot: "bg-blue" },
  draft: { chip: "bg-surface-2 text-fg-2", dot: "bg-fg-3" },
  needsApproval: { chip: "bg-warning-bg text-warning", dot: "bg-warning" },
  failed: { chip: "bg-danger-bg text-danger", dot: "bg-danger" },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const t = useTranslations("status");
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-sm px-2 text-[11px] leading-4 font-semibold whitespace-nowrap",
        s.chip,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", s.dot, status === "live" && "motion-safe:animate-pulse")}
      />
      {t(status)}
    </span>
  );
}
