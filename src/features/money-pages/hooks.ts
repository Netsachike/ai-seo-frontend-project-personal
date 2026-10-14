"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { moneyPageKeys } from "@/lib/api/query-keys";
import moneyPageService from "@/services/money-pages";

export const MONEY_PAGES_PER_PAGE = 20;

/** One page of the site's money pages, highest commercial score first. */
export function useMoneyPages(siteId: number, page: number) {
  return useQuery({
    queryKey: moneyPageKeys.list(siteId, page),
    enabled: Boolean(siteId),
    queryFn: async () => (await moneyPageService.list(siteId, { page, per_page: MONEY_PAGES_PER_PAGE })).data,
    placeholderData: (previous) => previous,
  });
}

export function useMoneyPage(siteId: number, id: number | null) {
  return useQuery({
    queryKey: moneyPageKeys.detail(siteId, id ?? 0),
    enabled: Boolean(siteId && id),
    queryFn: async () => (await moneyPageService.get(siteId, id as number)).data,
  });
}

/** What to do next for one money page: prioritised recommendations and the workflow. */
export function useMoneyPageRecommendations(siteId: number, id: number | null) {
  return useQuery({
    queryKey: moneyPageKeys.recommendations(siteId, id ?? 0),
    enabled: Boolean(siteId && id),
    queryFn: () => moneyPageService.recommendations(siteId, id as number),
  });
}

/** Finds the pages that make money (commercial intent, conversion signals) in the latest crawl. */
export function useAnalyzeMoneyPages(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await moneyPageService.analyze(siteId)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moneyPageKeys.all(siteId) }),
  });
}
