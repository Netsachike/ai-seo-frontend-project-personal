"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreatePublishingConnectionPayload, PublishArticlePayload } from "@/types/types";
import { contentKeys, publishingKeys } from "@/lib/api/query-keys";
import publishingService from "@/services/publishing";

/** The site's publishing connections. Credentials are never returned. */
export function usePublishingConnections(siteId: number | undefined) {
  return useQuery({
    queryKey: publishingKeys.connections(siteId ?? 0),
    enabled: Boolean(siteId),
    queryFn: async () => (await publishingService.connections(siteId as number)).data,
  });
}

/** Thrown when the provider answered but rejected the credentials (HTTP 200, `success: false`). */
export class ConnectionTestError extends Error {}

/**
 * Creates an API connection, then tests it: the backend creates API
 * connections as `pending` and only a passing test makes them `active`.
 */
export function useCreateConnection(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePublishingConnectionPayload) => {
      const { data: connection } = await publishingService.createConnection(siteId, payload);
      if (payload.method !== "api") return connection;
      const { data: result } = await publishingService.testConnection(siteId, connection.id);
      if (!result.success) throw new ConnectionTestError(result.message);
      return connection;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: publishingKeys.all(siteId) }),
  });
}

/** Re-tests a connection (sets it `active` or `error`). */
export function useTestConnection(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: number) => (await publishingService.testConnection(siteId, connectionId)).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: publishingKeys.all(siteId) }),
  });
}

export function usePublishArticle(siteId: number, articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PublishArticlePayload) => publishingService.publishArticle(siteId, articleId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publishingKeys.all(siteId) });
      return queryClient.invalidateQueries({ queryKey: contentKeys.all(siteId) });
    },
  });
}
