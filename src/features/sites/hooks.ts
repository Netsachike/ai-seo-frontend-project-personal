"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Site } from "@/types/types";
import { aiVisibilityKeys, siteKeys, topicalMapKeys } from "@/lib/api/query-keys";
import { useUiStore } from "@/lib/store/ui";
import aiVisibilityService from "@/services/ai-visibility";
import siteService from "@/services/sites";
import topicalMapService from "@/services/topical-maps";
import { siteSlug } from "./site-utils";

export type SiteStats = {
  /** Clusters with a page that targets them */
  clustersCovered: number;
  clustersTotal: number;
  /** 0–100; 0 before the first AI visibility test */
  visibility: number;
};

/**
 * Deletes a site for good, then drops it from every cached list and forgets
 * it as the selected site.
 */
export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (site: Site) => siteService.remove(site.id),
    onSuccess: (_, site) => {
      queryClient.setQueriesData<Site[]>({ queryKey: [...siteKeys.all, "list"] }, (list) =>
        list?.filter((s) => s.id !== site.id),
      );
      queryClient.removeQueries({ queryKey: siteKeys.detail(site.id) });
      const ui = useUiStore.getState();
      if (ui.brandSlug === siteSlug(site)) ui.setBrand("");
      return queryClient.invalidateQueries({ queryKey: [...siteKeys.all, "list"] });
    },
  });
}

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
