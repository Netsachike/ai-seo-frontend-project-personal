/**
 * UI mock data for the overview: per-platform visibility cards and the
 * getting-started progress. `br_new` is the zero-data brand.
 */
import type { Engine } from "@/lib/api/types";

/** Google Maps is tracked for local visibility; AI Overviews stays on the AI visibility screen. */
export type Platform = "google" | "maps" | Exclude<Engine, "aio">;

export type PlatformGlance = {
  platform: Platform;
  /** 0–1 share; null before the first scan */
  value: number | null;
  /** Percentage points versus the previous period */
  delta: number;
  spark: number[];
};

const isNew = (brandId: string) => brandId === "br_new";

/** Deterministic, gently rising series so every card reads as a trend. */
function series(seed: number, from: number, to: number, points = 30): number[] {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const wobble = Math.sin(i * 0.55 + seed) * 0.9 + Math.cos(i * 0.21 + seed * 2) * 0.6;
    return Math.round((from + (to - from) * t + wobble) * 10) / 10;
  });
}

export const platformOrder: Platform[] = ["google", "maps", "chatgpt", "claude", "gemini", "perplexity"];

export function platformGlance(brandId: string): PlatformGlance[] {
  if (isNew(brandId)) return platformOrder.map((platform) => ({ platform, value: null, delta: 0, spark: [] }));
  return [
    { platform: "google", value: 0.42, delta: 12, spark: series(1, 28, 42) },
    { platform: "maps", value: 0.28, delta: 8, spark: series(2, 21, 28) },
    { platform: "chatgpt", value: 0.52, delta: 7, spark: series(3, 44, 52) },
    { platform: "claude", value: 0.38, delta: 2, spark: series(4, 35, 38) },
    { platform: "gemini", value: 0.61, delta: 9, spark: series(5, 50, 61) },
    { platform: "perplexity", value: 0.47, delta: 5, spark: series(6, 41, 47) },
  ];
}

export const setupSteps = ["connect", "analyze", "discover", "optimize", "publish", "measure"] as const;
export type SetupStep = (typeof setupSteps)[number];

/** Index of the step in progress; earlier steps are done. */
export function setupProgress(brandId: string): number {
  return isNew(brandId) ? 1 : 3;
}
