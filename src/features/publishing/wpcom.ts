import publishingService from "@/services/publishing";

/**
 * WordPress.com OAuth. After consent the backend redirects to
 * `/settings/wordpress-com?connected=pending&pending_key=…`, where the user
 * picks the WordPress.com site. The Rankoya site and where to return are kept
 * across the redirect. The older `/integrations/wordpress-com/callback`
 * page (WordPress.com's `code` + `state`) still works.
 */
export const WPCOM_RETURN_PATH = "/settings/wordpress-com";
export const WPCOM_CALLBACK_PATH = "/integrations/wordpress-com/callback";
const PENDING_KEY = "rankoya:wpcom-pending";

export type PendingWpcomConnect = { siteId: number; returnTo: string };

export function readPendingWpcomConnect(): PendingWpcomConnect | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingWpcomConnect) : null;
  } catch {
    return null;
  }
}

export function clearPendingWpcomConnect() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/** Asks the backend for WordPress.com's consent URL and sends the browser there. */
export async function startWpcomConnect(pending: PendingWpcomConnect) {
  const { authorization_url } = await publishingService.wordpressComAuthorize(pending.siteId);
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Without storage the callback page falls back to the sites list.
  }
  window.location.assign(authorization_url);
}
