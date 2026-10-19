"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  BacklinkOpportunity,
  BacklinkProspectsPayload,
  BacklinkStatus,
  UpdateBacklinkPayload,
} from "@/types/types";
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

/** The board loads every opportunity (up to this many), since the API has no status filter. */
const BOARD_PAGE_SIZE = 100;
const BOARD_MAX_PAGES = 3;

/** Every link opportunity, for the outreach board. Sorted by score (the API's order). */
export function useOpportunityBoard(siteId: number) {
  return useQuery({
    queryKey: [...authorityKeys.opportunities(siteId), "board"],
    enabled: Boolean(siteId),
    queryFn: async () => {
      const first = await authorityService.opportunities(siteId, { page: 1, per_page: BOARD_PAGE_SIZE });
      const rows: BacklinkOpportunity[] = [...first.data];
      for (let page = 2; page <= Math.min(first.last_page, BOARD_MAX_PAGES); page++)
        rows.push(...(await authorityService.opportunities(siteId, { page, per_page: BOARD_PAGE_SIZE })).data);
      return { rows, total: first.total };
    },
  });
}

/** Moves an opportunity on the board straight away, then saves it (and rolls back if saving fails). */
export function useMoveOpportunity(siteId: number) {
  const queryClient = useQueryClient();
  const key = [...authorityKeys.opportunities(siteId), "board"];
  type Board = { rows: BacklinkOpportunity[]; total: number };
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: BacklinkStatus }) =>
      (await authorityService.updateOpportunity(siteId, id, { status })).opportunity,
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Board>(key);
      queryClient.setQueryData<Board>(key, (board) =>
        board ? { ...board, rows: board.rows.map((r) => (r.id === id ? { ...r, status } : r)) } : board,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => refresh(queryClient, siteId),
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
