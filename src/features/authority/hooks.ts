"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BacklinkProspectsPayload, UpdateBacklinkPayload } from "@/types/types";
import { authorityKeys } from "@/lib/api/query-keys";
import authorityService from "@/services/authority";

export const OPPORTUNITIES_PER_PAGE = 20;
export const BACKLINKS_PER_PAGE = 20;

/** The authority profile; `null` until the first analysis. */
export function useAuthorityProfile(siteId: number) {
  return useQuery({
    queryKey: authorityKeys.profile(siteId),
    enabled: Boolean(siteId),
    queryFn: async () => (await authorityService.profile(siteId)).profile,
  });
}

export function useBacklinkOpportunities(siteId: number, page: number) {
  return useQuery({
    queryKey: authorityKeys.opportunities(siteId, page),
    enabled: Boolean(siteId),
    queryFn: () => authorityService.opportunities(siteId, { page, per_page: OPPORTUNITIES_PER_PAGE }),
    placeholderData: (previous) => previous,
  });
}

export function useBacklinkOpportunity(siteId: number, id: number | null) {
  return useQuery({
    queryKey: authorityKeys.opportunity(siteId, id ?? 0),
    enabled: Boolean(siteId && id),
    queryFn: async () => (await authorityService.opportunity(siteId, id as number)).opportunity,
  });
}

/**
 * Live backlink metrics. They cost money per call, so they load only when
 * asked for (`refetch`) and are then kept for the session.
 */
export function useBacklinkSummary(siteId: number) {
  return useQuery({
    queryKey: authorityKeys.backlinkSummary(siteId),
    enabled: false,
    staleTime: Infinity,
    queryFn: () => authorityService.backlinkSummary(siteId),
  });
}

/** Live backlinks, one page (by offset) at a time. Paid per call, so only fetched when `enabled`. */
export function useBacklinks(siteId: number, offset: number, enabled: boolean) {
  return useQuery({
    queryKey: authorityKeys.backlinks(siteId, offset),
    enabled: Boolean(siteId) && enabled,
    staleTime: Infinity,
    queryFn: () => authorityService.backlinks(siteId, { limit: BACKLINKS_PER_PAGE, offset }),
    placeholderData: (previous) => previous,
  });
}

const refresh = (queryClient: ReturnType<typeof useQueryClient>, siteId: number) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: authorityKeys.profile(siteId) }),
    queryClient.invalidateQueries({ queryKey: [...authorityKeys.all(siteId), "opportunities"] }),
    queryClient.invalidateQueries({ queryKey: [...authorityKeys.all(siteId), "opportunity"] }),
  ]);

/** Recomputes the authority profile and the link opportunities. */
export function useAnalyzeAuthority(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authorityService.analyze(siteId),
    onSuccess: () => refresh(queryClient, siteId),
  });
}

export function useUpdateBacklinkOpportunity(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateBacklinkPayload }) =>
      (await authorityService.updateOpportunity(siteId, id, payload)).opportunity,
    onSettled: () => refresh(queryClient, siteId),
  });
}

/** Turns a competitor's backlinks into outreach prospects on the opportunities list. */
export function useDiscoverProspects(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BacklinkProspectsPayload) => authorityService.backlinkProspects(siteId, payload),
    onSuccess: () => refresh(queryClient, siteId),
  });
}
