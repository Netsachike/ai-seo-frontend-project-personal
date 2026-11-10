import { createHmac, timingSafeEqual } from "node:crypto";

import { IntegrationError } from "../errors";

/**
 * Wix through Rankoya's own Wix app (self-managed OAuth). The user installs
 * the app on their site; Rankoya keeps only the `instanceId` and mints a
 * 4-hour access token from app ID + app secret + instance ID whenever it
 * needs one. Server only: reads WIX_APP_SECRET.
 */

export function wixAppConfig() {
  const appId = process.env.WIX_APP_ID?.trim();
  const appSecret = process.env.WIX_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret, shareUrlId: process.env.WIX_SHARE_URL_ID?.trim() || null };
}

/** Wix's installer, which sends the user back to `postInstallationUrl` when done. */
export function wixInstallUrl(callbackUrl: string): string {
  const config = wixAppConfig();
  if (!config) throw new IntegrationError("not_configured", 500);
  const install = new URL("https://www.wix.com/app-installer");
  install.searchParams.set("appId", config.appId);
  if (config.shareUrlId) install.searchParams.set("shareUrlId", config.shareUrlId);
  install.searchParams.set("postInstallationUrl", callbackUrl);
  return install.toString();
}

/**
 * `signedInstance` is `signature.data`: an HMAC-SHA256 of the data part keyed
 * with the app secret, base64url-encoded. Verify it before trusting
 * `instanceId`.
 */
export function verifySignedInstance(signed: string): { instanceId: string } {
  const config = wixAppConfig();
  if (!config) throw new IntegrationError("not_configured", 500);
  const [sig, data] = signed.split(".");
  if (!sig || !data) throw new IntegrationError("signature", 400);
  const expected = createHmac("sha256", config.appSecret).update(data).digest("base64url");
  // Compare without base64 padding, which some installs include.
  const a = Buffer.from(sig.replace(/=+$/, ""));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new IntegrationError("signature", 400);
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString()) as { instanceId: string };
  } catch {
    throw new IntegrationError("signature", 400);
  }
}

/** A fresh access token for one installed instance (valid ~4 hours). Sent as `Authorization: <token>`, no `Bearer`. */
export async function wixToken(instanceId: string): Promise<string> {
  const config = wixAppConfig();
  if (!config) throw new IntegrationError("not_configured", 500);
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: config.appId,
      client_secret: config.appSecret,
      instance_id: instanceId,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!res.ok || !body?.access_token) throw new IntegrationError("token", 502);
  return body.access_token;
}

/** Listing blog categories fails when Wix Blog isn't added to the site. */
export async function assertBlogInstalled(token: string): Promise<void> {
  const res = await fetch("https://www.wixapis.com/blog/v3/categories?paging.limit=1", {
    headers: { Authorization: token, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new IntegrationError("no_blog", 422);
}
