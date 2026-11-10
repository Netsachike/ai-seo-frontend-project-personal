import { NextResponse, type NextRequest } from "next/server";

import { backend } from "@/lib/integrations/backend";
import { assertBlogInstalled, verifySignedInstance, wixToken } from "@/lib/integrations/connectors/wix";
import { IntegrationError } from "@/lib/integrations/errors";
import { readState, stateCookieName, stateCookieOptions, type OAuthState } from "@/lib/integrations/state";
import { withParams } from "@/lib/integrations/urls";

/** Error codes the connect dialog has a message for; anything else becomes `wix_save`. */
const KNOWN_CODES = new Set(["signature", "token", "no_blog", "not_configured"]);

/**
 * Step 2 of connecting Wix: Wix redirects here after the app is installed,
 * with `signedInstance` (Wix docs: "Wix redirects to postInstallationUrl with a
 * signedInstance query parameter"); the instance id is read from its signed data. Verifies
 * the state and the signature, checks Wix Blog is on the site, saves the
 * connection in Laravel and returns to where the user started with
 * `?connected=wix` or `?error=wix_<code>`.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const finish = (path: string, params: Record<string, string>) => {
    const response = NextResponse.redirect(new URL(withParams(path, params), request.url));
    response.cookies.delete({ name: stateCookieName("wix"), path: stateCookieOptions.path });
    return response;
  };

  let state: OAuthState;
  try {
    state = readState(request.cookies.get(stateCookieName("wix"))?.value, q.get("state"));
  } catch {
    return finish("/sites", { error: "wix_state" });
  }
  const fail = (code: string) => finish(state.returnTo, { error: `wix_${code}` });

  const signed = q.get("signedInstance");
  // Wix leaves signedInstance off when the install failed or was cancelled.
  if (!signed) return fail("cancelled");

  try {
    const instanceId = verifySignedInstance(signed).instanceId;
    // A plain instanceId param, if Wix adds one, has to agree with the signed one.
    const plain = q.get("instanceId");
    if (!instanceId || (plain && plain !== instanceId)) return fail("signature");
    const token = await wixToken(instanceId);
    await assertBlogInstalled(token);

    const created = await backend<{ data: { id: number } }>(`/sites/${state.siteId}/publishing/connections`, {
      method: "POST",
      body: JSON.stringify({
        name: "Wix",
        platform: "wix",
        method: "api",
        // No token is stored: Laravel mints one per publish from WIX_APP_ID/SECRET + instance_id.
        credentials: { instance_id: instanceId, site_id: q.get("tenantId") ?? "" },
        config: { auth: "app" },
      }),
    });
    // Activates it (pending → active), or records the error on the connection for the details page.
    await backend(`/sites/${state.siteId}/publishing/connections/${created.data.id}/test`, {
      method: "POST",
    }).catch(() => undefined);
    return finish(state.returnTo, { connected: "wix" });
  } catch (err) {
    const code = err instanceof IntegrationError && KNOWN_CODES.has(err.code) ? err.code : "save";
    return fail(code);
  }
}
