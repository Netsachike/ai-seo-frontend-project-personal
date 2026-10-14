"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Site } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { aiVisibilityKeys, opportunityKeys, publishingKeys, topicalMapKeys } from "@/lib/api/query-keys";
import aiVisibilityService from "@/services/ai-visibility";
import opportunityService from "@/services/opportunities";
import publishingService from "@/services/publishing";
import topicalMapService from "@/services/topical-maps";
import { isGscReady, useGscOverview } from "@/features/search-console/hooks";
import { usePublishingConnections } from "@/features/publishing/hooks";

/**
 * Runs an AI visibility test: the given prompts, or the latest active ones
 * (generating them from keywords first when there are none). Synchronous on
 * the backend, so this can take a while.
 */
export function useRunAiScan(siteId: number, promptIds?: number[]) {
  const t = useTranslations("insights.jobs");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (promptIds?.length) return (await aiVisibilityService.test(siteId, { prompt_ids: promptIds })).data;
      const { data: prompts } = await aiVisibilityService.prompts(siteId);
      if (prompts.length === 0) await aiVisibilityService.generatePrompts(siteId);
      return (await aiVisibilityService.test(siteId)).data;
    },
    onMutate: () => toast(t("job_scan.started")),
    onSuccess: () => {
      toast.success(t("job_scan.done"));
      return queryClient.invalidateQueries({ queryKey: aiVisibilityKeys.all(siteId) });
    },
    onError: (error) => toast.error(getErrorMessage(error, t("failed"))),
  });
}

export const GROWTH_STEPS = ["connect", "analyze", "discover", "optimize", "publish", "measure"] as const;

/**
 * How far the site is through the growth loop, from real data: the index of
 * the first step not done yet (GROWTH_STEPS.length when all are done).
 */
export function useGrowthProgress(site: Site) {
  const gsc = useGscOverview(site.id);
  const connections = usePublishingConnections(site.id);
  const maps = useQuery({
    queryKey: topicalMapKeys.list(site.id),
    queryFn: async () => (await topicalMapService.list(site.id)).data,
  });
  const opportunities = useQuery({
    queryKey: opportunityKeys.list(site.id),
    queryFn: async () => (await opportunityService.list(site.id)).data,
  });
  const publications = useQuery({
    queryKey: publishingKeys.publications(site.id),
    queryFn: async () => (await publishingService.publications(site.id)).data,
  });
  const visibility = useQuery({
    queryKey: aiVisibilityKeys.overview(site.id),
    queryFn: async () => (await aiVisibilityService.overview(site.id)).data,
  });

  const done: Record<(typeof GROWTH_STEPS)[number], boolean> = {
    connect: isGscReady(gsc.data?.connection) || (connections.data?.some((c) => c.status === "active") ?? false),
    analyze: Boolean(site.last_crawled_at),
    discover: (maps.data?.length ?? 0) > 0,
    optimize: (opportunities.data?.total ?? 0) > 0,
    publish: (publications.data?.total ?? 0) > 0,
    measure: (visibility.data?.total_tests ?? 0) > 0,
  };
  const current = GROWTH_STEPS.findIndex((step) => !done[step]);
  return current === -1 ? GROWTH_STEPS.length : current;
}
