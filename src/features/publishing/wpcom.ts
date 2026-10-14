import publishingService from "@/services/publishing";

/**
 * WordPress.com OAuth. The backend's redirect URI must point at this page,
 * which forwards `code` and `state` to the backend and lets the user pick
 * the WordPress.com site. The site and where to return are kept across the
 * redirect.
 */
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
