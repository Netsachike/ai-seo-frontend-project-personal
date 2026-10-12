"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { Delta } from "@/lib/mocks/types";
import { cn } from "@/lib/utils";
import { DeltaChip } from "@/components/brand/delta-chip";
import { colorize } from "./series-colors";

export type ShareItem = { brandId: string; name: string; isYou: boolean; share: number; delta: Delta };

/** Stacked share bar plus a ranked list. Shares are 0–1. */
export function ShareOfVoice({ items, className }: { items: ShareItem[]; className?: string }) {
  const t = useTranslations("charts");
  const format = useFormatter();
  const colored = colorize(items);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        role="img"
        aria-label={t("shareAria", {
          summary: colored.map((s) => `${s.name} ${format.number(s.share, "percent")}`).join(", "),
        })}
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
      >
        {colored.map((s) => (
          <span
            key={s.brandId}
            className="h-full first:rounded-s-full last:rounded-e-full"
            style={{ width: `${s.share * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <ul className="flex flex-col">
        {colored.map((s) => (
          <li key={s.brandId} className="flex h-9 items-center gap-2.5 border-b border-border text-small last:border-0">
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className={cn("min-w-0 flex-1 truncate", s.isYou && "font-semibold")}>{s.name}</span>
            <span className="num">{format.number(s.share, "percent")}</span>
            <DeltaChip value={s.delta.value} unit={s.delta.unit} variant="text" className="min-w-20 justify-end" />
          </li>
        ))}
      </ul>
    </div>
  );
}
