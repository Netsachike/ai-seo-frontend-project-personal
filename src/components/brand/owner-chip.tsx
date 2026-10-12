"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type Owner = "rankoya" | "you";

/** Who does the work: Rankoya (Signal fill) or You (blue tint). */
export function OwnerChip({ owner, className }: { owner: Owner; className?: string }) {
  const t = useTranslations("owner");
  return (
    <span
      className={cn(
        "inline-flex h-[22px] w-fit shrink-0 items-center rounded-full px-2 text-[11px] leading-4 font-semibold whitespace-nowrap",
        owner === "rankoya" ? "bg-signal text-signal-ink" : "bg-blue-bg text-blue-ink",
        className,
      )}
    >
      {t(owner)}
    </span>
  );
}
