"use client";

import * as React from "react";
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
import { AI_TEST_MODELS, AI_TEST_PROVIDER, modelLabel } from "@/features/visibility/model";

/** The test endpoint accepts at most 100 prompts per request. */
const MAX_TEST_PROMPTS = 100;

/** What to test: some models (default all) on some prompts (default the hook's, else every active one). */
export type AiScanInput = { models?: string[]; promptIds?: number[] };

/**
 * Runs AI visibility tests through OpenRouter, one request per model (the
 * endpoint takes a single model). Sends the given prompts, or every active
 * prompt (generating them from keywords first when there are none).
 * `mutate()` tests every model in turn; `mutate({ models: [model] })` tests
 * one, and `promptIds` narrows it to chosen questions. `current` is the
 * model being tested. Each request is synchronous and slow.
 */
export function useRunAiScan(siteId: number, promptIds?: number[]) {
  const t = useTranslations("insights.jobs");
  const queryClient = useQueryClient();
  const [current, setCurrent] = React.useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: AiScanInput | void) => {
      const models = input?.models?.length ? input.models : AI_TEST_MODELS.map((m) => m.id);
      let ids = input?.promptIds?.length ? input.promptIds : (promptIds ?? []);
      if (ids.length === 0) {
        let { data: prompts } = await aiVisibilityService.prompts(siteId);
        if (prompts.length === 0) {
          await aiVisibilityService.generatePrompts(siteId);
          prompts = (await aiVisibilityService.prompts(siteId)).data;
        }
        ids = prompts.slice(0, MAX_TEST_PROMPTS).map((p) => p.id);
      }
      if (ids.length === 0) throw new Error(t("noPrompts"));

      const failed: string[] = [];
      for (const model of models) {
        setCurrent(model);
        try {
          await aiVisibilityService.test(siteId, {
            prompt_ids: ids,
            limit: ids.length,
            provider: AI_TEST_PROVIDER,
            model,
          });
        } catch (error) {
          if (models.length === 1) throw error;
          failed.push(model);
        }
        // Each model's answers show as soon as they land.
        await queryClient.invalidateQueries({ queryKey: aiVisibilityKeys.all(siteId) });
      }
      if (failed.length === models.length) throw new Error(t("failed"));
      return { failed };
    },
    onMutate: () => toast(t("job_scan.started")),
    onSuccess: ({ failed }) =>
      failed.length
        ? toast.warning(t("job_scan.partial", { models: failed.map(modelLabel).join(", ") }))
        : toast.success(t("job_scan.done")),
    onError: (error) => toast.error(getErrorMessage(error, t("failed"))),
    onSettled: () => setCurrent(null),
  });
  return { ...mutation, current };
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
