import type { Site } from "@/types/types";
import { discoverTopics } from "./topics";

/**
 * Core-topic suggestions from the topical map. Started during the "Setting
 * up your site" interstitial so step 4 often opens with them already loaded.
 */
export const topicsQuery = (site: Pick<Site, "id">) => ({
  queryKey: ["site-setup", site.id, "topics"] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => discoverTopics(site.id, signal),
  staleTime: Infinity,
  retry: false,
});
