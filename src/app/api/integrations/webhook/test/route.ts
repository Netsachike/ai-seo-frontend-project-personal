import { NextResponse, type NextRequest } from "next/server";

import type { Site } from "@/types/types";
import { backend } from "@/lib/integrations/backend";
import { IntegrationError } from "@/lib/integrations/errors";
import { assertPublicHttpsUrl, sampleArticle, sendWebhook } from "@/lib/integrations/webhook";

/**
 * POST { site_id, url, secret? } → { secret, status }
 *
 * Sends a signed `test` event to a Make / Lovable / Replit webhook URL, so the
 * user sees it arrive before the connection is saved. Mints the signing
 * secret on the first try; later tries reuse it. Needs a signed-in user who
 * can open the site.
 */
export async function POST(request: NextRequest) {
  try {
    const input = (await request.json().catch(() => null)) as {
      site_id?: unknown;
      url?: unknown;
      secret?: unknown;
    } | null;
    const siteId = Number(input?.site_id);
    if (!Number.isInteger(siteId) || siteId <= 0 || typeof input?.url !== "string") {
      throw new IntegrationError("webhook_fields", 400);
    }
    // Signed when a secret is sent (Lovable, Replit); unsigned without one (Make, for now).
    const secret = typeof input.secret === "string" && /^whsec_[\w-]{20,}$/.test(input.secret) ? input.secret : null;

    const url = await assertPublicHttpsUrl(input.url);
    // Also proves the user can open this site.
    const { data: site } = await backend<{ data: Site }>(`/sites/${siteId}`);
    const status = await sendWebhook(url, secret, {
      event: "test",
      sent_at: new Date().toISOString(),
      site: { id: site.id, name: site.name, url: site.url },
      article: sampleArticle(),
    });
    if (status < 200 || status >= 300) {
      return NextResponse.json({ code: "webhook_rejected", status, secret }, { status: 502 });
    }
    return NextResponse.json({ secret, status });
  } catch (err) {
    const error = err instanceof IntegrationError ? err : new IntegrationError("webhook_unreachable", 502);
    const code =
      error.status === 401 ? "unauthenticated" : error.status === 403 || error.status === 404 ? "site" : error.message;
    return NextResponse.json({ code }, { status: error.status });
  }
}
