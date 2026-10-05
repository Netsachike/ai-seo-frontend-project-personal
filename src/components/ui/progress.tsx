"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

type Tone = "blue" | "success" | "warning" | "danger" | "ink" | "signal";

const toneClass: Record<Tone, string> = {
  blue: "bg-blue",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  ink: "bg-ink",
  signal: "bg-signal",
};

function Progress({
  className,
  value,
  tone = "blue",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={pct}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full rounded-full transition-[width] duration-400 ease-out", toneClass[tone])}
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
