import { createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { IntegrationError } from "./errors";

/**
 * Rankoya's outgoing webhook, shared by Make, Lovable and Replit. The backend
 * sends the same request when an article is published, so receivers built
 * against the test event keep working (see docs/integrations-testing.md).
 *
 * POST <webhook_url>
 *   Content-Type: application/json
 *   User-Agent: Rankoya-Webhooks/1.0
 *   X-Rankoya-Event: test | article.published | article.updated
 *   X-Rankoya-Timestamp: <unix seconds>
 *   X-Rankoya-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>", keyed with the secret>
 */
export type WebhookEvent = "test" | "article.published" | "article.updated";

export type WebhookArticle = {
  id: number;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  content_html: string;
  language: string | null;
  featured_image: string | null;
  published_at: string | null;
  updated_at: string | null;
};

export type WebhookBody = {
  event: WebhookEvent;
  sent_at: string;
  site: { id: number; name: string; url: string };
  article: WebhookArticle;
};

/** A new signing secret, shown once to the user and saved on the connection. */
export const newWebhookSecret = () => `whsec_${randomBytes(24).toString("base64url")}`;

export function signWebhook(secret: string, timestamp: number, rawBody: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
}

/** The article the test event carries: clearly a sample, in the real shape. */
export function sampleArticle(): WebhookArticle {
  const now = new Date().toISOString();
  return {
    id: 0,
    title: "Rankoya test article",
    slug: "rankoya-test-article",
    meta_title: "Rankoya test article",
    meta_description: "A sample sent by Rankoya to check your webhook. You can delete it.",
    content_html:
      "<h2>It works</h2><p>This is a test article from Rankoya. Real articles arrive in this same format when they're published.</p>",
    language: "en",
    featured_image: null,
    published_at: now,
    updated_at: now,
  };
}

/** True for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === "::" || a === "::1") return true;
    if (a.startsWith("::ffff:")) return isPrivateAddress(a.slice(7));
    return /^(f[cd]|fe[89ab]|ff)/.test(a);
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/**
 * Only public https URLs: the server makes this request, so an internal
 * address (metadata endpoints, localhost, the private network) is refused.
 */
export async function assertPublicHttpsUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new IntegrationError("webhook_url", 400);
  }
  if (url.protocol !== "https:" || url.username || url.password) throw new IntegrationError("webhook_url", 400);
  if (url.port && url.port !== "443") throw new IntegrationError("webhook_url", 400);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new IntegrationError("webhook_private", 400);
  }
  const addresses = isIP(host)
    ? [host]
    : await lookup(host, { all: true }).then(
        (rows) => rows.map((r) => r.address),
        () => {
          throw new IntegrationError("webhook_dns", 400);
        },
      );
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new IntegrationError("webhook_private", 400);
  return url;
}

/**
 * Sends one event, signed when there's a secret (the signature header is left
 * off without one: Make, for now). Redirects aren't followed. Returns the
 * receiver's status code.
 */
export async function sendWebhook(url: URL, secret: string | null, body: WebhookBody): Promise<number> {
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Rankoya-Webhooks/1.0",
        "X-Rankoya-Event": body.event,
        "X-Rankoya-Timestamp": String(timestamp),
        ...(secret ? { "X-Rankoya-Signature": signWebhook(secret, timestamp, raw) } : {}),
      },
      body: raw,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    await res.body?.cancel();
    return res.status;
  } catch {
    throw new IntegrationError("webhook_unreachable", 502);
  }
}
