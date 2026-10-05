"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import type { BrandSeries } from "@/lib/api/types";
import { isRtl } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { DeltaChip } from "@/components/brand/delta-chip";
import { colorize } from "./series-colors";

type Row = { date: string } & Record<string, number | string | null>;

/**
 * Daily score lines. The user's brand is drawn last (on top), thickest and in
 * `chart-you`; the legend and tooltip list it first.
 */
export function VisibilityTrend({
  series,
  height = 240,
  domain = [0, 100],
  lowerIsBetter = false,
  className,
  ariaLabel,
}: {
  series: BrandSeries[];
  height?: number;
  domain?: [number, number] | ["auto", "auto"];
  lowerIsBetter?: boolean;
  className?: string;
  ariaLabel: string;
}) {
  const locale = useLocale();
  const rtl = isRtl(locale);
  const format = useFormatter();
  const colored = React.useMemo(
    () => colorize([...series].sort((a, b) => Number(b.isYou) - Number(a.isYou))),
    [series],
  );

  const rows = React.useMemo<Row[]>(() => {
    const dates = series[0]?.points.map((p) => p.date) ?? [];
    return dates.map((date, i) => {
      const row: Row = { date };
      for (const s of series) row[s.brandId] = s.points[i]?.value ?? null;
      return row;
    });
  }, [series]);

  const tickDate = (value: string) =>
    format.dateTime(new Date(`${value}T00:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-caption font-normal text-fg-2">
        {colored.map((s) => (
          <li key={s.brandId} className="flex items-center gap-1.5">
            <span aria-hidden className="h-[3px] w-3.5 rounded-full" style={{ background: s.color }} />
            <span className={cn(s.isYou && "font-semibold text-fg")}>{s.name}</span>
          </li>
        ))}
      </ul>
      <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 24, bottom: 0, left: 24 }}>
            <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
            <XAxis
              dataKey="date"
              reversed={rtl}
              tickFormatter={tickDate}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              tick={{ fill: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            />
            <YAxis
              orientation={rtl ? "right" : "left"}
              reversed={lowerIsBetter}
              domain={domain}
              width={32}
              tickLine={false}
              axisLine={false}
              tickCount={4}
              tick={{ fill: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              content={({ active, label }) => (
                <TrendTooltip
                  active={active}
                  label={label as string | number | undefined}
                  colored={colored}
                  rows={rows}
                  tickDate={tickDate}
                  lowerIsBetter={lowerIsBetter}
                />
              )}
            />
            {[...colored].reverse().map((s) => (
              <Line
                key={s.brandId}
                dataKey={s.brandId}
                name={s.name}
                type="monotone"
                stroke={s.color}
                strokeWidth={s.isYou ? 2 : 1.5}
                dot={false}
                activeDot={{ r: s.isYou ? 4 : 3, strokeWidth: 2, stroke: "var(--surface)" }}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendTooltip({
  active,
  label,
  colored,
  rows,
  tickDate,
  lowerIsBetter,
}: {
  active?: boolean;
  label?: string | number;
  colored: (BrandSeries & { color: string })[];
  rows: Row[];
  tickDate: (value: string) => string;
  lowerIsBetter: boolean;
}) {
  const t = useTranslations("charts");
  const format = useFormatter();
  if (!active || label === undefined) return null;
  const index = rows.findIndex((r) => r.date === label);
  const row = rows[index];
  const prev = rows[index - 1];
  if (!row) return null;

  return (
    <div className="min-w-48 rounded-md bg-surface p-3 text-small shadow-pop">
      <p className="mb-2 text-caption text-fg-3">{tickDate(String(label))}</p>
      <ul className="flex flex-col gap-1.5">
        {colored.map((s) => {
          const value = row[s.brandId];
          const before = prev?.[s.brandId];
          return (
            <li key={s.brandId} className="flex items-center gap-2">
              <span aria-hidden className="size-2 rounded-[2px]" style={{ background: s.color }} />
              <span className={cn("flex-1 truncate", s.isYou && "font-semibold")}>{s.name}</span>
              <span className="num">{typeof value === "number" ? format.number(value, "decimal") : t("noValue")}</span>
              {typeof value === "number" && typeof before === "number" && (
                <DeltaChip value={value - before} unit={lowerIsBetter ? "rank" : "points"} variant="text" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
