import publishingService from "@/services/publishing";

/**
 * Wix, through Rankoya's Wix app. The backend runs the whole install:
 * `POST /sites/{site}/publishing/wix/authorize` returns the Wix installer
 * link (valid 15 minutes, works once), and its callback creates and tests the
 * connection, then redirects to `{returnTo}?connected=wix&connection_id=…` or
 * `{returnTo}?error=<message>`. `useConnectReturn` picks those up.
 *
 * `returnTo` is a path only: the backend refuses full URLs and appends the
 * query string itself.
 */
export async function startWixConnect({ siteId, returnTo }: { siteId: number; returnTo: string }) {
  const { authorization_url } = await publishingService.wixAuthorize(siteId, returnTo.split("?")[0]);
  window.location.assign(authorization_url);
}
