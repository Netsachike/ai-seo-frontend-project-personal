"use client";

import { useFormatter } from "next-intl";

import { cn } from "@/lib/utils";

export type Band = { label: string; count: number; tone: "best" | "good" | "mid" | "none" };

const toneFill: Record<Band["tone"], string> = {
  best: "bg-success",
  good: "bg-chart-you",
  mid: "bg-chart-other",
  none: "bg-border-strong",
};

/** Keywords per position band. Bars scale to the largest band. */
export function RankDistribution({
  bands,
  className,
  ariaLabel,
}: {
  bands: Band[];
  className?: string;
  ariaLabel: string;
}) {
  const format = useFormatter();
  const max = Math.max(1, ...bands.map((b) => b.count));
  return (
    <ul aria-label={ariaLabel} className={cn("flex flex-col gap-2.5", className)}>
      {bands.map((b) => (
        <li
          key={b.label}
          className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)_2.5rem] items-center gap-3 text-small"
        >
          <span className="text-fg-2">{b.label}</span>
          <span className="h-3.5 overflow-hidden rounded-sm bg-surface-2">
            <span
              className={cn("block h-full rounded-sm", toneFill[b.tone])}
              style={{ width: `${(b.count / max) * 100}%` }}
            />
          </span>
          <span className="text-end num">{format.number(b.count, "integer")}</span>
        </li>
      ))}
    </ul>
  );
}
