import { NextResponse, type NextRequest } from "next/server";

import type { Article, Site } from "@/types/types";
import { serviceBackend } from "@/lib/integrations/backend";
import { IntegrationError } from "@/lib/integrations/errors";
import { readFeedToken, renderJsonFeed, renderRss, toFeedItem } from "@/lib/integrations/feed";

/** Newest articles per feed. */
const FEED_SIZE = 50;

/**
 * Public feed of a site's published articles, read by feed readers, Make's
 * RSS module, and Lovable / Replit apps. No login: the signed token in the
 * path is the key (see lib/integrations/feed.ts).
 *
 *   /api/feeds/<token>               RSS 2.0
 *   /api/feeds/<token>?format=json   JSON Feed 1.1
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/feeds/[token]">) {
  const { token } = await ctx.params;
  const json = request.nextUrl.searchParams.get("format") === "json";
  try {
    const siteId = readFeedToken(token);
    if (siteId === null) throw new IntegrationError("feed_not_found", 404);

    // Internal, server-to-server route (backend brief §5): no workspace check, read-only.
    const {
      data: { site, articles },
    } = await serviceBackend<{ data: { site: Site; articles: Article[] } }>(
      `/internal/sites/${siteId}/feed?limit=${FEED_SIZE}`,
    );
    const items = articles.map(toFeedItem).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
    const selfUrl = request.nextUrl.toString();
    // Readers poll often; a few minutes at the edge keeps that off the backend.
    const cache = "public, max-age=300, s-maxage=900, stale-while-revalidate=3600";

    if (json) {
      return NextResponse.json(renderJsonFeed(site, items, selfUrl), {
        headers: { "Content-Type": "application/feed+json; charset=utf-8", "Cache-Control": cache },
      });
    }
    return new NextResponse(renderRss(site, items, selfUrl), {
      headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": cache },
    });
  } catch (err) {
    const error = err instanceof IntegrationError ? err : new IntegrationError("feed_failed", 502);
    const status = error.status === 404 ? 404 : error.status === 503 ? 503 : 502;
    const message =
      status === 404
        ? "Feed not found."
        : status === 503
          ? "Feeds aren't set up yet."
          : "Feed unavailable. Try again later.";
    return new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
