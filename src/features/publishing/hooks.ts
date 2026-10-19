"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreatePublishingConnectionPayload, Publication, PublishArticlePayload } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
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

/**
 * The connection was saved but its test failed: the provider rejected the
 * credentials (HTTP 200, `success: false`) or could not be reached (422).
 * The connection stays `pending`/`error` and can be tested again.
 */
export class ConnectionTestError extends Error {}

/**
 * Activates a connection: `/test` is what turns a `pending` connection
 * `active`. Throws ConnectionTestError when the test does not pass.
 */
async function activate(siteId: number, connectionId: number) {
  let result;
  try {
    result = (await publishingService.testConnection(siteId, connectionId)).data;
  } catch (error) {
    throw new ConnectionTestError(getErrorMessage(error, "The connection test failed."));
  }
  if (!result.success) throw new ConnectionTestError(result.message);
  return result;
}

/**
 * Connects a publishing platform in the backend's order: create the
 * connection (API connections start `pending`), then test it by id to
 * activate it. Only an `active` connection can publish.
 *
 * When the test fails, submitting the same details again re-tests the
 * connection already saved instead of creating a duplicate (the API has no
 * update or delete for connections). Changed details create a new one.
 */
export function useCreateConnection(siteId: number) {
  const queryClient = useQueryClient();
  const untested = React.useRef<{ key: string; id: number } | null>(null);
  return useMutation({
    mutationFn: async (payload: CreatePublishingConnectionPayload) => {
      const key = JSON.stringify(payload);
      const id =
        untested.current?.key === key
          ? untested.current.id
          : (await publishingService.createConnection(siteId, payload)).data.id;
      if (payload.method !== "api") return id;
      untested.current = { key, id };
      await activate(siteId, id);
      untested.current = null;
      return id;
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

/** The blogs in a connected Shopify store. Shopify needs one picked to publish an article. */
export function useShopifyBlogs(siteId: number | undefined, connectionId: number | undefined) {
  return useQuery({
    queryKey: publishingKeys.shopifyBlogs(siteId ?? 0, connectionId ?? 0),
    enabled: Boolean(siteId && connectionId),
    queryFn: async () => (await publishingService.shopifyBlogs(siteId as number, connectionId as number)).data,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** How a publish goes out: live on the site, or saved as a draft there to review first. */
export type PublishMode = "publish" | "draft";

/** One page of the publishing history (25 per page, newest first). */
export function usePublicationsPage(siteId: number | undefined, page: number) {
  return useQuery({
    queryKey: publishingKeys.publications(siteId ?? 0, page),
    enabled: Boolean(siteId),
    queryFn: async () => (await publishingService.publications(siteId as number, { page })).data,
    placeholderData: (previous) => previous,
  });
}

/** The API has no per-article filter, so the newest 4 pages (100 attempts) are scanned. */
const RECENT_PAGES = 4;

/** Every publish attempt for one article, newest first, from the most recent publications. */
export function useArticlePublications(siteId: number | undefined, articleId: number) {
  return useQuery({
    queryKey: publishingKeys.recent(siteId ?? 0),
    enabled: Boolean(siteId),
    queryFn: async () => {
      const first = (await publishingService.publications(siteId as number)).data;
      const rows = [...first.data];
      for (let page = 2; page <= Math.min(first.last_page, RECENT_PAGES); page++)
        rows.push(...(await publishingService.publications(siteId as number, { page })).data.data);
      return rows;
    },
    select: (rows) =>
      rows.filter((p) => p.article_id === articleId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  });
}

/** A manual connection only prepares the article; nothing goes live until it is pasted in. */
export const isManualPublication = (publication: Pick<Publication, "status">) =>
  publication.status === "ready_for_manual_publish";

/** Badge colour for a publication status. */
export const publicationVariant = (status: string) =>
  status === "published"
    ? "success"
    : status === "failed"
      ? "danger"
      : status === "ready_for_manual_publish"
        ? "warning"
        : "neutral";
