"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { DeltaUnit } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Tone = "good" | "bad" | "flat";

/**
 * Rank and position deltas are "lower is better": moving from #8 to #3 is
 * `value: -5, unit: "rank"` and renders as a green ▲ 5. For other units the
 * arrow follows the number and `invert` flips only the color (e.g. fewer
 * keywords "not ranking" is good).
 */
export function useDelta(value: number, unit: DeltaUnit, invert = false) {
  const format = useFormatter();
  const t = useTranslations("delta");

  const rounded = unit === "count" ? Math.round(value) : Math.round(value * 10) / 10;
  const isZero = rounded === 0;
  const lowerIsBetter = unit === "rank" || invert;
  const tone: Tone = isZero ? "flat" : rounded < 0 === lowerIsBetter ? "good" : "bad";
  const arrowUp = unit === "rank" ? tone === "good" : rounded > 0;
  const arrow = isZero ? "—" : arrowUp ? "▲" : "▼";

  const abs = Math.abs(rounded);
  const digits = unit === "count" ? 0 : 1;
  const number = format.number(unit === "percent" ? abs / 100 : abs, {
    style: unit === "percent" ? "percent" : "decimal",
    minimumFractionDigits: isZero ? 1 : unit === "count" || (unit === "rank" && Number.isInteger(abs)) ? 0 : digits,
    maximumFractionDigits: digits,
    numberingSystem: "latn",
  });
  const sign = isZero || unit === "rank" ? "" : rounded > 0 ? "+" : "−";
  // LRI…PDI isolates the signed number so "+6.2" keeps its order inside RTL sentences.
  const signed = `⁦${sign}${number}⁩`;
  const body = unit === "points" ? t("points", { value: signed }) : signed;
  const label = isZero ? t("flat") : t(tone === "good" ? "improved" : "declined", { value: body });

  return { tone, arrow, text: body, label };
}

const toneClass: Record<Tone, string> = {
  good: "text-success",
  bad: "text-danger",
  flat: "text-fg-3",
};
const toneBg: Record<Tone, string> = {
  good: "bg-success-bg",
  bad: "bg-danger-bg",
  flat: "bg-surface-2",
};

export function DeltaChip({
  value,
  unit,
  invert,
  variant = "chip",
  className,
}: {
  value: number;
  unit: DeltaUnit;
  invert?: boolean;
  /** `chip` has a tinted background; `text` is for dense tables. */
  variant?: "chip" | "text";
  className?: string;
}) {
  const { tone, arrow, text, label } = useDelta(value, unit, invert);
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 num text-[12px] leading-4 font-medium whitespace-nowrap",
        toneClass[tone],
        variant === "chip" && ["rounded-sm px-1.5 py-0.5", toneBg[tone]],
        className,
      )}
    >
      <span aria-hidden className="text-[9px]">
        {arrow}
      </span>
      <bdi aria-hidden>{text}</bdi>
      <span className="sr-only">{label}</span>
    </span>
  );
}
