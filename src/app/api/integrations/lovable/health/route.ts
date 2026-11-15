import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { IntegrationError } from "@/lib/integrations/errors";
import { assertPublicHttpsUrl } from "@/lib/integrations/webhook";

/**
 * POST { base_url, api_key } → { ok: true } | { code }
 *
 * Checks a Lovable site before its connection is saved: calls
 * GET {base_url}/api/public/rankoya/health with the user's RANKOYA_API_KEY in
 * X-Rankoya-API-Key. Healthy means a 2xx JSON answer that doesn't say
 * `success: false`. Lovable apps answer unknown paths with a non-JSON page or a
 * 404/406, which means the setup prompt hasn't added the route yet. Nothing is
 * stored or logged here; the connect form saves the connection afterwards.
 */
export async function POST(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ code: "unauthenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { base_url?: unknown; api_key?: unknown } | null;
  const baseUrl = typeof body?.base_url === "string" ? body.base_url.trim().replace(/\/+$/, "") : "";
  const apiKey = typeof body?.api_key === "string" ? body.api_key.trim() : "";
  if (!baseUrl || !apiKey) return NextResponse.json({ code: "lovable_fields" }, { status: 422 });

  let url: URL;
  try {
    url = await assertPublicHttpsUrl(`${baseUrl}/api/public/rankoya/health`);
  } catch (err) {
    const code = err instanceof IntegrationError && err.code === "webhook_dns" ? "lovable_dns" : "lovable_url";
    return NextResponse.json({ code }, { status: 422 });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-Rankoya-API-Key": apiKey, Accept: "application/json", "User-Agent": "Rankoya/1.0" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json({ code: "lovable_unavailable" }, { status: 502 });
  }

  const isJson = (res.headers.get("content-type") ?? "").includes("application/json");
  const answer = isJson ? ((await res.json().catch(() => null)) as { success?: unknown } | null) : null;

  if (res.status === 401 || res.status === 403) return NextResponse.json({ code: "lovable_auth" }, { status: 422 });
  if (res.ok && answer && answer.success !== false) return NextResponse.json({ ok: true });
  if (res.ok && answer?.success === false) return NextResponse.json({ code: "lovable_auth" }, { status: 422 });
  if (res.status === 404 || res.status === 406 || (res.ok && !isJson)) {
    return NextResponse.json({ code: "lovable_not_found" }, { status: 422 });
  }
  return NextResponse.json({ code: "lovable_unavailable", status: res.status }, { status: 502 });
}
