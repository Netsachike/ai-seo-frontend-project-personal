"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { DeltaChip } from "./delta-chip";

/**
 * A position with its change. `change` is "places moved": negative = moved
 * up the results (good), rendered as a green ▲.
 */
export function RankCell({
  position,
  change,
  className,
}: {
  position: number | null;
  change?: number | null;
  className?: string;
}) {
  const t = useTranslations("rank");
  return (
    <span className={cn("inline-flex items-center justify-end gap-2", className)}>
      <span className="num text-[13px] font-medium text-fg">
        {position === null ? (
          <>
            <span aria-hidden className="text-fg-3">
              —
            </span>
            <span className="sr-only">{t("notRanking")}</span>
          </>
        ) : (
          t("position", { position })
        )}
      </span>
      {change !== undefined && change !== null && <DeltaChip value={change} unit="rank" variant="text" />}
    </span>
  );
}
