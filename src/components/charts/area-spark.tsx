"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Small area chart: a line plus a soft gradient fill in one accent color
 * (a CSS variable, so it follows the theme). Time runs in reading direction,
 * so the chart mirrors in RTL. Decorative; the card states the numbers.
 */
export function AreaSpark({
  values,
  color,
  height = 56,
  className,
}: {
  values: number[];
  color: string;
  height?: number;
  className?: string;
}) {
  const id = React.useId().replace(/:/g, "");

  if (values.length < 2) {
    return (
      <div aria-hidden className={cn("flex items-end", className)} style={{ height }}>
        <div className="h-px w-full border-t border-dashed border-border-strong" />
      </div>
    );
  }

  const w = 100;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / span) * (h - 10)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("block w-full rtl:-scale-x-100", className)}
      style={{ height }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        style={{ stroke: color }}
        strokeWidth={1.75}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
