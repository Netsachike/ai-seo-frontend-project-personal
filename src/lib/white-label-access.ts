import type { AddonAccessResponse } from "@/types/types";

/**
 * The backend's verification of the White Label (`reseller_seats`) add-on.
 *
 * `hasWhiteLabel` in `lib/subscription.ts` reads the `authUser` cookie, which
 * the client writes and can edit: fine for deciding what to render, useless as
 * a boundary. This module asks the API instead, and uses plain `fetch` with no
 * browser imports so proxy.ts can use it too.
 */

/** Path on the API, relative to NEXT_PUBLIC_API_BASE_URL. */
export const whiteLabelAccessPath = (userId: number | string) => `/users/${userId}/addons/reseller-seats/access`;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Asks the backend whether this account owns the add-on.
 *
 * Returns `null` (not `false`) when the question could not be answered: no
 * token, no API configured (demo mode), network failure or an unexpected
 * shape. Callers decide what unknown means for them; the UI falls back to the
 * cookie so a blip does not lock a paying reseller out.
 */
export async function fetchWhiteLabelAccess(
  userId: number | string | null | undefined,
  token: string | null | undefined,
): Promise<boolean | null> {
  if (!userId || !token || !API_BASE_URL) return null;

  try {
    const response = await fetch(`${API_BASE_URL}${whiteLabelAccessPath(userId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      // Per-user and can change the moment an add-on is bought or revoked.
      cache: "no-store",
    });

    if (!response.ok) {
      // A 403 here is the backend saying "no", not a failure to ask.
      if (response.status === 401 || response.status === 403) return false;
      return null;
    }

    const data = (await response.json()) as AddonAccessResponse;
    return typeof data?.has_access === "boolean" ? data.has_access : null;
  } catch {
    return null;
  }
}
