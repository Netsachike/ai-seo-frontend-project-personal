"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GscProperty } from "@/types/types";
import { searchConsoleKeys } from "@/lib/api/query-keys";
import searchConsoleService from "@/services/search-console";

/**
 * Google sends the browser back to `{FRONTEND_URL}/settings/search-console?connected=1`
 * with no site in the URL, so the site and where to return are kept here
 * across the redirect.
 */
const PENDING_KEY = "rankoya:gsc-pending";
export const GSC_RETURN_PATH = "/settings/search-console";

export type PendingGscConnect = { siteId: number; domain: string; returnTo: string };

export function readPendingGscConnect(): PendingGscConnect | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingGscConnect) : null;
  } catch {
    return null;
  }
}

export function clearPendingGscConnect() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/** Asks the backend for Google's consent URL and sends the browser there. */
export async function startGscConnect(pending: PendingGscConnect) {
  const { data } = await searchConsoleService.connect(pending.siteId);
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Without storage the return page falls back to the sites list.
  }
  window.location.assign(data.authorization_url);
}

/** Connection status, totals and the latest query rows. `connection` is null until connected. */
export function useGscOverview(siteId: number | undefined) {
  return useQuery({
    queryKey: searchConsoleKeys.overview(siteId ?? 0),
    enabled: Boolean(siteId),
    queryFn: async () => (await searchConsoleService.overview(siteId as number)).data,
  });
}

/** True once a property is chosen: before that, Search Console is authorised but not usable. */
export const isGscReady = (connection: { status: string; property: string | null } | null | undefined) =>
  Boolean(connection?.property) && connection?.status === "connected";

export function useGscProperties(siteId: number | undefined) {
  return useQuery({
    queryKey: searchConsoleKeys.properties(siteId ?? 0),
    enabled: Boolean(siteId),
    queryFn: async () => (await searchConsoleService.properties(siteId as number)).data,
  });
}

/** The property that matches the site's domain: the domain property first, then a URL-prefix one. */
export function matchingProperty(properties: GscProperty[], domain: string) {
  const bare = domain.replace(/^www\./, "");
  return (
    properties.find((p) => p.property === `sc-domain:${bare}`) ??
    properties.find((p) => p.property.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") === bare)
  );
}

/** Saves the chosen property, then pulls its data. The sync runs on and is not awaited. */
export function useSelectGscProperty(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (property: string) => (await searchConsoleService.selectProperty(siteId, property)).data,
    onSuccess: () => {
      void searchConsoleService
        .sync(siteId)
        .finally(() => queryClient.invalidateQueries({ queryKey: searchConsoleKeys.all(siteId) }));
      return queryClient.invalidateQueries({ queryKey: searchConsoleKeys.all(siteId) });
    },
  });
}

/** Pulls the last 30 days (the backend default) again. */
export function useSyncGsc(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await searchConsoleService.sync(siteId)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: searchConsoleKeys.all(siteId) }),
  });
}
