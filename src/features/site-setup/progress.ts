"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { SITE_SETUP_STEPS, type SiteSetupStep } from "@/types/types";

/**
 * The furthest setup step each site has reached. The backend has no setup
 * field, so it lives in this browser: a site created here starts at
 * "details"; a site with no record (finished, or created elsewhere) opens its
 * dashboard.
 */
type ProgressState = {
  steps: Record<string, SiteSetupStep>;
  set: (siteId: number, step: SiteSetupStep | null) => void;
};

export const useSetupProgress = create<ProgressState>()(
  persist(
    (set) => ({
      steps: {},
      set: (siteId, step) =>
        set((state) => {
          const steps = { ...state.steps };
          if (step) steps[siteId] = step;
          else delete steps[siteId];
          return { steps };
        }),
    }),
    { name: "rankoya:setup-progress", storage: createJSONStorage(() => localStorage) },
  ),
);

/** The step to resume at, or null once setup is finished. */
export function useSetupStep(siteId: number): SiteSetupStep | null {
  return useSetupProgress((s) => {
    const step = s.steps[siteId] ?? null;
    // A browser that stopped on a step since removed ("billing") resumes at the one after it.
    return step && !(SITE_SETUP_STEPS as readonly string[]).includes(step) ? "integration" : step;
  });
}

export const setSetupStep = (siteId: number, step: SiteSetupStep | null) =>
  useSetupProgress.getState().set(siteId, step);
