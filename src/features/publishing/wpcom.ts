import type { WordpressComSite } from "@/types/types";
import publishingService from "@/services/publishing";

/**
 * WordPress.com OAuth. After consent the backend redirects to
 * `/settings/wordpress-com?connected=pending&pending_key=…&site_id=…`
 * (outside the app shell). That page keeps the authorization and forwards to
 * where the user started: the setup integration step or the site's
 * WordPress.com page, which both show `WpcomSitePicker`. The older
 * `/integrations/wordpress-com/callback` page (WordPress.com's `code` +
 * `state`) still works.
 */
export const WPCOM_RETURN_PATH = "/settings/wordpress-com";
export const WPCOM_CALLBACK_PATH = "/integrations/wordpress-com/callback";
const PENDING_KEY = "rankoya:wpcom-pending";
const AUTH_KEY = "rankoya:wpcom-auth";
/** The backend's pending key lasts 10 minutes. */
const AUTH_TTL_MS = 10 * 60_000;

export type PendingWpcomConnect = { siteId: number; returnTo: string };

/** A WordPress.com sign-in waiting for its site to be chosen. */
export type WpcomAuthorization = {
  siteId: number;
  pendingKey: string;
  /** From the backend's redirect (`sites` JSON or `sites_id`); empty when it didn't send them. */
  sites: WordpressComSite[];
  expiresAt: number;
};

const read = <T>(key: string): T | null => {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const remove = (key: string) => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing to clear.
  }
};

export const readPendingWpcomConnect = () => read<PendingWpcomConnect>(PENDING_KEY);
export const clearPendingWpcomConnect = () => remove(PENDING_KEY);

/** Asks the backend for WordPress.com's consent URL and sends the browser there. */
export async function startWpcomConnect(pending: PendingWpcomConnect) {
  const { authorization_url } = await publishingService.wordpressComAuthorize(pending.siteId);
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Without storage the return page asks which site this was for.
  }
  window.location.assign(authorization_url);
}

export function saveWpcomAuthorization(auth: Omit<WpcomAuthorization, "expiresAt">) {
  try {
    window.sessionStorage.setItem(AUTH_KEY, JSON.stringify({ ...auth, expiresAt: Date.now() + AUTH_TTL_MS }));
  } catch {
    // Storage blocked: the picker will say the sign-in has to start again.
  }
}

/** The sign-in for this site, while its pending key is still valid. */
export function readWpcomAuthorization(siteId: number): WpcomAuthorization | null {
  const auth = read<WpcomAuthorization>(AUTH_KEY);
  return auth && auth.siteId === siteId && auth.expiresAt > Date.now() ? auth : null;
}

/**
 * The WordPress.com sites the backend put on the redirect: `sites` as JSON
 * (`[{ id, name, url }]`), or just their ids in `sites_id` (comma-separated).
 */
export function sitesFromUrl(params: URLSearchParams): WordpressComSite[] {
  const raw = params.get("sites");
  if (raw) {
    try {
      const list: unknown = JSON.parse(raw);
      if (Array.isArray(list))
        return list.flatMap((s) =>
          s && typeof s === "object" && "id" in s
            ? [
                {
                  id: String((s as { id: unknown }).id),
                  name: String((s as { name?: unknown }).name ?? ""),
                  url: String((s as { url?: unknown }).url ?? ""),
                },
              ]
            : [],
        );
    } catch {
      // Not JSON: fall through to the ids.
    }
  }
  return (params.get("sites_id") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id && id !== "undefined" && id !== "null")
    .map((id) => ({ id, name: "", url: "" }));
}

export const clearWpcomAuthorization = () => remove(AUTH_KEY);
