"use client";

import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { hasWhiteLabel } from "@/lib/subscription";
import SubscriptionService from "@/services/subscriptions";
import { accountKeys } from "./query-keys";
import { useSessionUser } from "./use-session-user";

export interface WhiteLabelAccessState {
  /** "checking" until the backend answers, or fails to. */
  status: "checking" | "ready";
  /** What every gated control reads. */
  hasAccess: boolean;
  /** True once the backend, not the cookie, is what `hasAccess` reflects. */
  verified: boolean;
}

/**
 * Whether this account owns the White Label add-on, so the upgrade page and
 * the agency kit agree.
 *
 * Two gates, in order: the `authUser` cookie answers instantly (a rendering
 * hint only, since the client writes it), then the backend answers for real
 * and overrides it either way. If the backend can't be reached, the cookie's
 * answer stands: a dropped request is not evidence someone stopped paying.
 */
export function useWhiteLabelAccess(): WhiteLabelAccessState {
  const sessionUser = useSessionUser();
  const cookieAccess = hasWhiteLabel(sessionUser?.subscriptions);
  const userId = sessionUser?.id ?? null;

  const query = useQuery({
    queryKey: accountKeys.whiteLabelAccess(userId ?? "none"),
    enabled: Boolean(userId),
    retry: false,
    queryFn: async () => {
      try {
        const response = await SubscriptionService.getWhiteLabelAccess(userId as number);
        return Boolean(response?.has_access);
      } catch (error) {
        console.warn("[Orbit][WhiteLabel] ACCESS_CHECK_FAILED", {
          userId,
          error: getErrorMessage(error, "Unable to verify White Label access."),
        });
        throw error;
      }
    },
  });

  if (!userId) return { status: "ready", hasAccess: cookieAccess, verified: false };
  if (query.isSuccess) return { status: "ready", hasAccess: query.data, verified: true };
  if (query.isError) return { status: "ready", hasAccess: cookieAccess, verified: false };
  return { status: "checking", hasAccess: cookieAccess, verified: false };
}
