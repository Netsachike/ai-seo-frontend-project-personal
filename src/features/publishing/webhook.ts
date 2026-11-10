"use client";

import { useQuery } from "@tanstack/react-query";

/** Providers that receive articles by webhook; saved as platform `custom` with config.provider. */
export type WebhookProvider = "make" | "lovable" | "replit";

/** Test codes that have their own message under `integrations.webhook.errors`. */
export const WEBHOOK_ERRORS = [
  "webhook_url",
  "webhook_private",
  "webhook_dns",
  "webhook_unreachable",
  "webhook_rejected",
  "site",
  "unauthenticated",
] as const;
export type WebhookError = (typeof WEBHOOK_ERRORS)[number];

/** A signing secret made in the browser, so the user can set it up in their app before the first test. */
export function newWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const b64 = btoa(String.fromCharCode(...bytes));
  return `whsec_${b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

/** Sends the signed test event through /api/integrations/webhook/test. */
export async function sendWebhookTest(input: {
  siteId: number;
  url: string;
  secret: string;
}): Promise<{ ok: true; status: number } | { ok: false; error: WebhookError; status?: number }> {
  try {
    const res = await fetch("/api/integrations/webhook/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: input.siteId, url: input.url.trim(), secret: input.secret }),
    });
    const body = (await res.json().catch(() => null)) as { code?: string; status?: number } | null;
    if (res.ok) return { ok: true, status: body?.status ?? res.status };
    const code = body?.code ?? "";
    return {
      ok: false,
      error: (WEBHOOK_ERRORS as readonly string[]).includes(code) ? (code as WebhookError) : "webhook_unreachable",
      status: body?.status,
    };
  } catch {
    return { ok: false, error: "webhook_unreachable" };
  }
}

export type FeedLinks = { rss: string; json: string; ready: boolean };

/** The site's signed RSS and JSON feed links. */
export function useFeedLinks(siteId: number | undefined) {
  return useQuery({
    queryKey: ["integrations", "feed", siteId ?? 0],
    enabled: Boolean(siteId),
    staleTime: Infinity,
    queryFn: async (): Promise<FeedLinks> => {
      const res = await fetch(`/api/integrations/rss?site=${siteId}`);
      if (!res.ok) throw new Error(`feed_${res.status}`);
      return (await res.json()) as FeedLinks;
    },
  });
}

/**
 * What to paste into Lovable or Replit so the app gets an endpoint that
 * receives Rankoya's articles and a blog that shows them. In English on
 * purpose: it's an instruction for the AI builder, not UI copy.
 */
export function builderPrompt(): string {
  return `Add a blog to this app that receives articles from Rankoya by webhook.

1. Create a server endpoint: POST /api/rankoya-webhook (for Lovable, a Supabase Edge Function named "rankoya-webhook" with JWT verification turned off).
2. Store a secret named RANKOYA_WEBHOOK_SECRET. I'll paste its value when asked. Never put it in frontend code.
3. Verify every request before using it:
   - Read the raw request body as text, before parsing JSON.
   - Headers: X-Rankoya-Timestamp (unix seconds) and X-Rankoya-Signature ("sha256=<hex>").
   - Compute HMAC-SHA256 of "<timestamp>.<raw body>" with RANKOYA_WEBHOOK_SECRET, hex-encoded, and compare it to the signature with a constant-time comparison.
   - Reject with 401 if it doesn't match, or if the timestamp is more than 5 minutes old.
4. The JSON body is: { event, sent_at, site: { id, name, url }, article: { id, title, slug, meta_title, meta_description, content_html, language, featured_image, published_at, updated_at } }.
   - event "test": reply 200 and store nothing.
   - event "article.published" or "article.updated": upsert the article into a "posts" table keyed by article.id (columns: rankoya_id, title, slug, meta_title, meta_description, content_html, featured_image, published_at, updated_at), then reply 200.
5. Add pages: /blog lists posts newest first; /blog/:slug shows one post, renders content_html as HTML, and sets the page <title> and meta description from meta_title and meta_description.

When it's done, tell me the full public URL of the endpoint.`;
}
