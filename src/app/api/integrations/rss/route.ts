import { NextResponse, type NextRequest } from "next/server";

import type { Site } from "@/types/types";
import { backend } from "@/lib/integrations/backend";
import { IntegrationError } from "@/lib/integrations/errors";
import { feedToken } from "@/lib/integrations/feed";
import { appUrl } from "@/lib/integrations/urls";

/**
 * GET ?site=<id> → { rss, json, ready }
 *
 * The site's feed links, for a signed-in user who can open the site.
 * `ready` is false until the backend service token is set, so the card can
 * say the feed won't load yet.
 */
export async function GET(request: NextRequest) {
  try {
    const siteId = Number(request.nextUrl.searchParams.get("site"));
    if (!Number.isInteger(siteId) || siteId <= 0) throw new IntegrationError("site", 400);
    await backend<{ data: Site }>(`/sites/${siteId}`);
    const rss = `${appUrl(request.url)}/api/feeds/${feedToken(siteId)}`;
    return NextResponse.json({
      rss,
      json: `${rss}?format=json`,
      ready: Boolean(process.env.BACKEND_SERVICE_TOKEN?.trim()),
    });
  } catch (err) {
    const error = err instanceof IntegrationError ? err : new IntegrationError("feed_failed", 500);
    return NextResponse.json({ code: error.message }, { status: error.status });
  }
}
