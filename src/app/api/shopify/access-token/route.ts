import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";

/** Only a store's own admin domain, never an arbitrary host. */
const STORE_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/**
 * Exchanges a Shopify Dev Dashboard app's Client ID and secret for an Admin
 * API access token (the client credentials grant). Shopify's token endpoint
 * sends no CORS headers, so the browser can't call it; this does it
 * server-side. Nothing is stored or logged: the token goes straight back to
 * the connect form. Signed-in users only, so it isn't an open relay.
 */
export async function POST(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ message: "Sign in to connect Shopify." }, { status: 401 });
  }

  let body: { store_domain?: unknown; client_id?: unknown; client_secret?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const storeDomain =
    typeof body.store_domain === "string"
      ? body.store_domain
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .split(/[/?#]/)[0]
      : "";
  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  const clientSecret = typeof body.client_secret === "string" ? body.client_secret.trim() : "";

  if (!STORE_DOMAIN.test(storeDomain)) {
    return NextResponse.json(
      { message: "Enter your store's address ending in .myshopify.com.", field: "store_domain" },
      { status: 422 },
    );
  }
  if (!clientId || !clientSecret) {
    return NextResponse.json({ message: "Enter both the Client ID and the Client secret." }, { status: 422 });
  }

  try {
    const response = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await response.json().catch(() => null)) as {
      access_token?: string;
      scope?: string;
      expires_in?: number;
      error_description?: string;
      error?: string;
    } | null;

    if (!response.ok || !data?.access_token) {
      const status = response.status === 404 ? 404 : 422;
      return NextResponse.json(
        {
          message:
            response.status === 404
              ? `We couldn't find a Shopify store at ${storeDomain}.`
              : (data?.error_description ??
                "Shopify didn't accept those credentials. Check the Client ID and secret, and that the app is installed on this store."),
        },
        { status },
      );
    }

    return NextResponse.json({
      store_domain: storeDomain,
      access_token: data.access_token,
      scope: data.scope ?? "",
      expires_in: data.expires_in ?? null,
    });
  } catch {
    return NextResponse.json({ message: "We couldn't reach Shopify. Try again in a moment." }, { status: 502 });
  }
}
