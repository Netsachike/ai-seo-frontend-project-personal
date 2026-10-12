"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import type { SiteSetupStep } from "@/types/types";
import { PROGRESS_STEPS, setupPath, stepFromPath } from "../steps";

/**
 * The current step comes from the URL on every render, so browser Back and
 * Forward animate too. Steps change with history.pushState rather than
 * router.push: Next keeps usePathname in sync, and the page stays mounted so
 * the outgoing step can animate out.
 */
export function useStepNav(siteId: string) {
  const pathname = usePathname();
  const step = stepFromPath(pathname);
  const index = PROGRESS_STEPS.indexOf(step);

  // Adjusting state during render (not a ref) keeps this correct under Strict Mode.
  const [prevIndex, setPrevIndex] = React.useState(index);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  if (index !== prevIndex) {
    setDirection(index > prevIndex ? 1 : -1);
    setPrevIndex(index);
  }

  const go = React.useCallback(
    (next: SiteSetupStep, { replace = false }: { replace?: boolean } = {}) => {
      const url = setupPath(siteId, next);
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    [siteId],
  );

  return { step, index, direction, go };
}
