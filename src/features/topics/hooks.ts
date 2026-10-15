"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Keyword } from "@/types/types";
import { keywordKeys, topicalMapKeys } from "@/lib/api/query-keys";
import keywordService from "@/services/keywords";
import topicalMapService from "@/services/topical-maps";

/**
 * Where analysis left a keyword. Only `accepted` keywords can be researched;
 * `null` means the keyword hasn't been analyzed yet.
 */
export function keywordQualityOf(keyword: Keyword): "accepted" | "rejected" | null {
  const status = keyword.quality.status ?? keyword.status;
  return status === "accepted" || status === "rejected" ? status : null;
}

/** Every topical map the site has, newest first, each with its clusters. */
export function useTopicalMaps(siteId: number) {
  return useQuery({
    queryKey: topicalMapKeys.list(siteId),
    enabled: Boolean(siteId),
    queryFn: async () => [...(await topicalMapService.list(siteId)).data].sort((a, b) => b.id - a.id),
  });
}

/** One map with its clusters, target pages and keywords. */
export function useTopicalMap(siteId: number, mapId: number | null) {
  return useQuery({
    queryKey: topicalMapKeys.detail(siteId, mapId ?? 0),
    enabled: Boolean(siteId && mapId),
    queryFn: async () => (await topicalMapService.get(siteId, mapId as number)).data,
  });
}

/** One page (100 rows, by opportunity score) of the site's keywords. */
export function useKeywordsPage(siteId: number, page: number) {
  return useQuery({
    queryKey: keywordKeys.list(siteId, page),
    enabled: Boolean(siteId),
    queryFn: () => keywordService.list(siteId, { page }),
    placeholderData: (previous) => previous,
  });
}

const refreshAll = (queryClient: ReturnType<typeof useQueryClient>, siteId: number) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: topicalMapKeys.list(siteId) }),
    queryClient.invalidateQueries({ queryKey: keywordKeys.all(siteId) }),
  ]);

/** Builds (or rebuilds) the topical map from the current keywords. */
export function useBuildMap(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await topicalMapService.build(siteId)).data,
    onSuccess: () => refreshAll(queryClient, siteId),
  });
}

/** Scores and clusters every keyword (quality, scoring, clustering). */
export function useAnalyzeKeywords(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await keywordService.analyze(siteId)).data,
    onSuccess: () => refreshAll(queryClient, siteId),
  });
}

/**
 * Discovers keywords from the latest crawl plus optional seeds, scores and
 * clusters them, then rebuilds the map so the new keywords land in clusters.
 */
export function useGrowMap(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (seeds: string[]) => {
      const { data: discovered } = await keywordService.discover(siteId, seeds.length ? { seed_keywords: seeds } : {});
      await keywordService.analyze(siteId);
      const { data: built } = await topicalMapService.build(siteId);
      return { discovered, built };
    },
    onSettled: () => refreshAll(queryClient, siteId),
  });
}
