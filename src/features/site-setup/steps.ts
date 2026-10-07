import { z } from "zod";

import { SITE_SETUP_STEPS, type SiteSetupStep } from "@/lib/api/types";

/**
 * Every step the progress bar counts. "account" (the workspace) exists before
 * site setup starts, so the domain screen already reads "Step 2 of 8".
 */
export const PROGRESS_STEPS = ["account", ...SITE_SETUP_STEPS] as const;
export type ProgressStep = (typeof PROGRESS_STEPS)[number];
export const TOTAL_STEPS = PROGRESS_STEPS.length;

export const stepNumber = (step: ProgressStep) => PROGRESS_STEPS.indexOf(step) + 1;

export const isSetupStep = (value: string): value is SiteSetupStep =>
  (SITE_SETUP_STEPS as readonly string[]).includes(value);

/** Steps that drop the image pane and use the full width. */
export const WIDE_STEPS: readonly ProgressStep[] = ["billing"];

export const NEW_SITE_PATH = "/sites/new";
export const SITES_PATH = "/sites";
export const setupPath = (siteId: string, step: SiteSetupStep) => `/sites/${siteId}/setup/${step}`;

/** Reads the step out of /sites/{id}/setup/{step}; the domain screen is "details" too. */
export function stepFromPath(pathname: string): ProgressStep {
  const match = /\/sites\/[^/]+\/setup\/([^/?#]+)/.exec(pathname);
  return match && isSetupStep(match[1]) ? match[1] : "details";
}

/** Accepts pasted URLs: protocol, "www." and any path are dropped. */
export const domainSchema = z
  .string()
  .trim()
  .transform((v) =>
    v
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0],
  )
  .pipe(z.string().regex(/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/));

/** Exactly this many core topics anchor the topical map. */
export const CORE_TOPIC_COUNT = 5;

/** Loose check for a domain typed into a plain field (an optional path is allowed). */
export const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;
