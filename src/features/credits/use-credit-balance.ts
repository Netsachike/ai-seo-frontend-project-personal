"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CREDITS_CHANGED_EVENT, isApiConfigured } from "@/services/api/api";
import creditsService from "@/services/credits";
import type { CreditBalance } from "@/types/types";
import { accountKeys } from "@/features/account/query-keys";
import { useSessionUser } from "@/features/account/use-session-user";

/** Spec rule: warn and offer a credit pack at 25% of what the account was given. */
export const LOW_BALANCE_RATIO = 0.25;

export interface CreditSummary {
  available: number;
  reserved: number;
  used: number;
  /**
   * Everything the wallet has received: available + held + spent. The backend
   * has no "granted" total yet, so this is derived; reservations that are
   * released go back into `available`, so the sum holds.
   */
  received: number;
  /** Share of `received` still available, 0–1. 0 when nothing was received. */
  remainingRatio: number;
  isLow: boolean;
  isEmpty: boolean;
}

export function summarizeCredits(balance: CreditBalance): CreditSummary {
  const available = Math.max(0, balance.balance_credits ?? 0);
  const reserved = Math.max(0, balance.reserved_credits ?? 0);
  const used = Math.max(0, balance.total_credits_charged ?? 0);
  const received = available + reserved + used;
  const remainingRatio = received > 0 ? available / received : 0;
  return {
    available,
    reserved,
    used,
    received,
    remainingRatio,
    isEmpty: available === 0,
    isLow: received > 0 && available > 0 && remainingRatio <= LOW_BALANCE_RATIO,
  };
}

/**
 * The signed-in user's credit wallet. Refetches on focus and whenever a billed
 * call (or a 402 "insufficient credits") goes through the API client.
 */
export function useCreditBalance() {
  const session = useSessionUser();
  const queryClient = useQueryClient();
  const enabled = isApiConfigured && Boolean(session?.id);

  React.useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: accountKeys.credits() });
    window.addEventListener(CREDITS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, refresh);
  }, [queryClient]);

  const query = useQuery({
    queryKey: accountKeys.credits(),
    queryFn: creditsService.getBalance,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const summary = React.useMemo(() => (query.data ? summarizeCredits(query.data) : null), [query.data]);

  return { ...query, enabled, summary };
}
