"use client";

import { parseAsIsoDate, parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs";

import type { Engine } from "@/types/types";
import { engines } from "@/types/types";

export const rangeOptions = ["7d", "30d", "90d", "custom"] as const;
export type RangeOption = (typeof rangeOptions)[number];

const DAY = 24 * 60 * 60 * 1000;
const presetDays = { "7d": 7, "30d": 30, "90d": 90 } as const;

/** Date range lives in the URL (`?range=7d`, or `?range=custom&from=…&to=…`), so it survives refresh and sharing. */
export function useRange() {
  const [state, setState] = useQueryStates({
    range: parseAsStringLiteral(rangeOptions).withDefault("30d"),
    from: parseAsIsoDate,
    to: parseAsIsoDate,
  });
  const custom = state.range === "custom" && state.from && state.to;
  const days = custom
    ? Math.max(1, Math.round(((state.to as Date).getTime() - (state.from as Date).getTime()) / DAY) + 1)
    : presetDays[state.range === "custom" ? "30d" : state.range];
  return {
    range: state.range,
    from: state.from,
    to: state.to,
    /** Clamped to what the mock series can show. */
    days: Math.min(90, days),
    setPreset: (range: Exclude<RangeOption, "custom">) => setState({ range, from: null, to: null }),
    setCustom: (from: Date, to: Date) => setState({ range: "custom", from, to }),
  };
}

export const engineFilterOptions = ["all", ...engines] as const;

export function useEngineFilter() {
  const [engine, setEngine] = useQueryState("engine", parseAsStringLiteral(engineFilterOptions).withDefault("all"));
  return { engine: engine as Engine | "all", setEngine };
}
