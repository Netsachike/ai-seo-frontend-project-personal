"use client";

import { useQuery } from "@tanstack/react-query";

import { aiVisibilityKeys, topicalMapKeys } from "@/lib/api/query-keys";
import aiVisibilityService from "@/services/ai-visibility";
import topicalMapService from "@/services/topical-maps";

export type SiteStats = {
  /** Clusters with a page that targets them */
  clustersCovered: number;
  clustersTotal: number;
  /** 0–100; 0 before the first AI visibility test */
  visibility: number;
};

/** Headline numbers for a site card: topical-map coverage and the AI visibility score. */
export function useSiteStats(siteId: number) {
  const maps = useQuery({
    queryKey: topicalMapKeys.list(siteId),
    queryFn: async () => (await topicalMapService.list(siteId)).data,
  });
  const visibility = useQuery({
    queryKey: aiVisibilityKeys.overview(siteId),
    queryFn: async () => (await aiVisibilityService.overview(siteId)).data,
  });

  const clusters = maps.data?.flatMap((map) => map.clusters) ?? [];
  const stats: SiteStats = {
    clustersCovered: clusters.filter((cluster) => cluster.target_page_id !== null).length,
    clustersTotal: clusters.length,
    visibility: visibility.data?.visibility_score ?? 0,
  };
  return { stats, isPending: maps.isPending || visibility.isPending };
}
