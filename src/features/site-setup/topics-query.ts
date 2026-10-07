import type { Brand } from "@/lib/api/types";
import { generateTopics } from "./fake-ai";

/**
 * Core-topic suggestions. Started during the "Setting up your site"
 * interstitial so step 4 often opens with them already loaded.
 */
export const topicsQuery = (site: Pick<Brand, "id" | "name" | "domain">) => ({
  queryKey: ["site-setup", site.id, "topics", site.domain] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => generateTopics(site, signal),
  staleTime: Infinity,
});
