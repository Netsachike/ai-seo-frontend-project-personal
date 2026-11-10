import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { wixAppConfig, wixInstallUrl } from "@/lib/integrations/connectors/wix";
import { createState, stateCookieName, stateCookieOptions } from "@/lib/integrations/state";
import { appUrl, safeReturnTo, withParams } from "@/lib/integrations/urls";

/**
 * Step 1 of connecting Wix: a plain link from the connect dialog,
 * `/api/integrations/wix/start?site=<id>&returnTo=<path>`. Sends the user to
 * Wix's installer for the Rankoya app, with a signed state cookie that the
 * callback checks.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const siteId = params.get("site");
  const returnTo = safeReturnTo(params.get("returnTo"));
  const back = (error: string) => NextResponse.redirect(new URL(withParams(returnTo, { error }), request.url));

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(returnTo)}`, request.url));
  }
  if (!siteId || !/^\d+$/.test(siteId)) return back("wix_site");
  if (!wixAppConfig() || (process.env.INTEGRATIONS_STATE_SECRET ?? "").length < 32) {
    return back("wix_not_configured");
  }

  const { state, cookie } = createState({ provider: "wix", siteId, returnTo });
  // Only the random nonce travels through Wix; the site and return path stay in the signed cookie.
  const callback = new URL("/api/integrations/wix/callback", appUrl(request.url));
  callback.searchParams.set("state", state.nonce);

  const response = NextResponse.redirect(wixInstallUrl(callback.toString()));
  response.cookies.set(stateCookieName("wix"), cookie, stateCookieOptions);
  return response;
}
