"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { UpdateRssFeedPayload } from "@/types/types";
import { publishingKeys } from "@/lib/api/query-keys";
import rssService from "@/services/rss";

const rssKey = (siteId: number) => [...publishingKeys.all(siteId), "rss"] as const;

/** The site's RSS feed settings; `exists` is false until the feed has been created. */
export function useRssFeed(siteId: number | undefined) {
  return useQuery({
    queryKey: rssKey(siteId ?? 0),
    enabled: Boolean(siteId),
    queryFn: async () => (await rssService.get(siteId as number)).data,
  });
}

/** Create, update, switch on/off and replace the link. Each one reloads the settings afterwards. */
export function useRssFeedActions(siteId: number) {
  const queryClient = useQueryClient();
  const onSettled = () => queryClient.invalidateQueries({ queryKey: rssKey(siteId) });
  return {
    create: useMutation({ mutationFn: async () => (await rssService.create(siteId)).data, onSettled }),
    update: useMutation({
      mutationFn: async (payload: UpdateRssFeedPayload) => (await rssService.update(siteId, payload)).data,
      onSettled,
    }),
    toggle: useMutation({ mutationFn: async () => (await rssService.toggle(siteId)).data, onSettled }),
    regenerate: useMutation({ mutationFn: async () => (await rssService.regenerate(siteId)).data, onSettled }),
  };
}
