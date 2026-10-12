"use client";

import Link from "next/link";

import type { Delta } from "@/lib/mocks/types";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "./animated-number";
import { DeltaChip } from "./delta-chip";

export type KpiCardProps = {
  label: string;
  value: number;
  format: (value: number) => string;
  /** Optional suffix rendered after the number, e.g. "/ 62". */
  suffix?: string;
  delta?: Delta;
  invertDelta?: boolean;
  spark?: number[];
  note?: string;
  href?: string;
  className?: string;
};

/** Overline, Metric value, DeltaChip, sparkline. Links to its detail screen. */
export function KpiCard({
  label,
  value,
  format,
  suffix,
  delta,
  invertDelta,
  spark,
  note,
  href,
  className,
}: KpiCardProps) {
  const body = (
    <>
      <span className="text-overline text-fg-3">{label}</span>
      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-metric text-fg">
          <AnimatedNumber value={value} format={format} />
          {suffix && <span className="text-fg-3">{suffix}</span>}
        </span>
        {delta && <DeltaChip value={delta.value} unit={delta.unit} invert={invertDelta} />}
      </span>
      {spark && <Sparkline values={spark} height={36} />}
      {note && <span className="text-caption font-normal text-fg-2">{note}</span>}
    </>
  );

  const base = cn(
    "flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-surface p-5 text-fg shadow-card",
    className,
  );

  if (!href) return <div className={base}>{body}</div>;
  return (
    <Link
      href={href}
      className={cn(base, "transition-colors duration-120 hover:border-border-strong hover:bg-surface-hover")}
    >
      {body}
    </Link>
  );
}

export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-border bg-surface p-5", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
