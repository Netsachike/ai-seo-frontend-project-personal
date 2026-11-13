import { NextResponse, type NextRequest } from "next/server";

import type { ArticleWithRelations, Site } from "@/types/types";
import { backend } from "@/lib/integrations/backend";
import { IntegrationError } from "@/lib/integrations/errors";
import { assertPublicHttpsUrl, sendWebhook } from "@/lib/integrations/webhook";

/**
 * POST { site_id, article_id, url, secret? } → { status }
 *
 * STOPGAP until Laravel has a webhook publisher. Sends one real article to a
 * Make / Lovable / Replit webhook as `article.published`, straight from Next,
 * when the user asks for it. Nothing is saved: no connection, no publishing
 * history, and the article's status in Rankoya stays as it was. Autopilot
 * never uses this. The article is read as the signed-in user, so only their
 * own sites' articles can be sent.
 */
export async function POST(request: NextRequest) {
  try {
    const input = (await request.json().catch(() => null)) as {
      site_id?: unknown;
      article_id?: unknown;
      url?: unknown;
      secret?: unknown;
    } | null;
    const siteId = Number(input?.site_id);
    const articleId = Number(input?.article_id);
    if (
      !Number.isInteger(siteId) ||
      siteId <= 0 ||
      !Number.isInteger(articleId) ||
      articleId <= 0 ||
      typeof input?.url !== "string"
    ) {
      throw new IntegrationError("webhook_fields", 400);
    }
    const secret = typeof input.secret === "string" && /^whsec_[\w-]{20,}$/.test(input.secret) ? input.secret : null;

    const url = await assertPublicHttpsUrl(input.url);
    const [{ data: site }, { data }] = await Promise.all([
      backend<{ data: Site }>(`/sites/${siteId}`),
      backend<{ data: { article: ArticleWithRelations } }>(`/sites/${siteId}/articles/${articleId}`),
    ]);
    const article = data.article;
    if (!article.content?.trim()) throw new IntegrationError("webhook_no_content", 422);

    const now = new Date().toISOString();
    const status = await sendWebhook(url, secret, {
      event: "article.published",
      sent_at: now,
      site: { id: site.id, name: site.name, url: site.url },
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        content_html: article.content,
        language: article.language,
        featured_image: null,
        published_at: article.published_at ?? now,
        updated_at: article.updated_at,
      },
    });
    if (status < 200 || status >= 300) {
      return NextResponse.json({ code: "webhook_rejected", status }, { status: 502 });
    }
    return NextResponse.json({ status });
  } catch (err) {
    if (!(err instanceof IntegrationError)) console.error("[webhook publish]", err);
    const error = err instanceof IntegrationError ? err : new IntegrationError("webhook_unreachable", 502);
    const code =
      error.status === 401 ? "unauthenticated" : error.status === 403 || error.status === 404 ? "site" : error.message;
    return NextResponse.json({ code }, { status: error.status });
  }
}
