import type { Site } from "@/types/types";
import { useSetupStore } from "./store";
import { discoverTopics } from "./topics";

/**
 * Core-topic suggestions from the topical map. Started during the "Setting
 * up your site" interstitial so step 4 often opens with them already loaded.
 */
export const topicsQuery = (site: Pick<Site, "id">) => ({
  queryKey: ["site-setup", site.id, "topics"] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    discoverTopics(site.id, useSetupStore.getState().drafts[site.id]?.crawlRunId ?? null, signal),
  staleTime: Infinity,
});
