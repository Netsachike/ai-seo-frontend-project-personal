"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Site } from "@/types/types";
import { aiVisibilityKeys } from "@/lib/api/query-keys";
import aiVisibilityService from "@/services/ai-visibility";
import { buildQuestionDetail, buildVisibilityData } from "./model";

const useOverview = (siteId: number) =>
  useQuery({
    queryKey: aiVisibilityKeys.overview(siteId),
    queryFn: async () => (await aiVisibilityService.overview(siteId)).data,
  });

const usePrompts = (siteId: number) =>
  useQuery({
    queryKey: aiVisibilityKeys.prompts(siteId),
    queryFn: async () => (await aiVisibilityService.prompts(siteId)).data,
  });

/**
 * Results come 100 per page, newest first. Five models answering every prompt
 * fill a page quickly, so read up to 5 pages to find the latest answer per
 * prompt and model.
 */
const MAX_RESULT_PAGES = 5;
const useResults = (siteId: number) =>
  useQuery({
    queryKey: aiVisibilityKeys.results(siteId),
    queryFn: async () => {
      const first = (await aiVisibilityService.results(siteId)).data;
      const rows = [...first.data];
      for (let page = 2; page <= Math.min(first.last_page, MAX_RESULT_PAGES); page++)
        rows.push(...(await aiVisibilityService.results(siteId, { page })).data.data);
      return rows;
    },
  });

/** Everything the AI visibility screen shows, built from the overview, prompts and results. */
export function useVisibility(site: Site | undefined) {
  const siteId = site?.id ?? 0;
  const overview = useOverview(siteId);
  const prompts = usePrompts(siteId);
  const results = useResults(siteId);
  const queries = [overview, prompts, results];
  return {
    data:
      site && overview.data && prompts.data && results.data
        ? buildVisibilityData(overview.data, prompts.data, results.data, site)
        : undefined,
    isPending: !site || queries.some((q) => q.isPending),
    isError: queries.some((q) => q.isError),
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  };
}

/** One prompt and its latest answers. `data` is null when the prompt is not active on this site. */
export function useQuestion(site: Site | undefined, promptId: number) {
  const siteId = site?.id ?? 0;
  const prompts = usePrompts(siteId);
  const results = useResults(siteId);
  const prompt = prompts.data?.find((p) => p.id === promptId);
  return {
    data:
      site && prompts.data && results.data
        ? prompt
          ? buildQuestionDetail(prompt, results.data, site)
          : null
        : undefined,
    isPending: !site || prompts.isPending || results.isPending,
    isError: prompts.isError || results.isError,
    refetch: () => Promise.all([prompts.refetch(), results.refetch()]),
  };
}

/** Generates test prompts from the site's keywords. */
export function useGeneratePrompts(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (limit?: number) => (await aiVisibilityService.generatePrompts(siteId, { limit })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiVisibilityKeys.all(siteId) }),
  });
}
