"use client";

import * as React from "react";

/**
 * True once `ready` is true and `minMs` has passed since `active` turned on,
 * so a fast answer never flashes its loader.
 */
export function useMinDuration(active: boolean, ready: boolean, minMs: number) {
  const [elapsed, setElapsed] = React.useState(false);
  // Turning `active` on again starts a fresh wait (state adjusted during render, not in an effect).
  const [wasActive, setWasActive] = React.useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    setElapsed(false);
  }
  React.useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setElapsed(true), minMs);
    return () => clearTimeout(timer);
  }, [active, minMs]);
  return active && ready && elapsed;
}

/** How many of `thresholdsMs` have passed while `active`: drives a loader's escalating subline. */
export function useElapsedStage(active: boolean, thresholdsMs: readonly number[]) {
  const key = thresholdsMs.join(",");
  const [stage, setStage] = React.useState(0);
  const [run, setRun] = React.useState({ active, key });
  if (run.active !== active || run.key !== key) {
    setRun({ active, key });
    setStage(0);
  }
  React.useEffect(() => {
    if (!active) return;
    const timers = key.split(",").map((ms, i) => setTimeout(() => setStage(i + 1), Number(ms)));
    return () => timers.forEach(clearTimeout);
  }, [active, key]);
  return stage;
}
