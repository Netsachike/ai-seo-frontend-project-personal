import { createHmac, timingSafeEqual } from "node:crypto";

import type { Article, Site } from "@/types/types";
import { IntegrationError } from "./errors";

/**
 * Feed links: `/api/feeds/<siteId>.<signature>`. The signature is an HMAC of
 * the site id, so a link can't be guessed or edited to read another site,
 * and nothing has to be stored. Rotating `FEED_TOKEN_SECRET` replaces every
 * link at once. Server only.
 */
function secret(): string {
  const value = process.env.FEED_TOKEN_SECRET || process.env.INTEGRATIONS_STATE_SECRET;
  if (!value || value.length < 32) throw new IntegrationError("feed_secret_missing", 503);
  return value;
}

const signature = (siteId: number) =>
  createHmac("sha256", secret()).update(`feed:v1:${siteId}`).digest("base64url").slice(0, 32);

export const feedToken = (siteId: number) => `${siteId}.${signature(siteId)}`;

/** The site id in a feed token, or null when it was edited or made up. */
export function readFeedToken(token: string): number | null {
  const match = /^(\d{1,12})\.([\w-]{32})$/.exec(token);
  if (!match) return null;
  const siteId = Number(match[1]);
  const expected = Buffer.from(signature(siteId));
  const given = Buffer.from(match[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? siteId : null;
}

export type FeedItem = {
  id: number;
  title: string;
  url: string | null;
  summary: string;
  html: string;
  image: string | null;
  language: string | null;
  published: string;
  updated: string;
};

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Where a published article lives, when the backend has recorded it. */
function articleUrl(article: Article): string | null {
  const meta = (article.metadata ?? {}) as Record<string, unknown>;
  return str(meta.published_url) ?? str(meta.url);
}

function articleImage(article: Article): string | null {
  const meta = (article.metadata ?? {}) as Record<string, unknown>;
  const first = Array.isArray(article.media) ? (article.media[0] as Record<string, unknown> | undefined) : undefined;
  return str(meta.featured_image) ?? str(first?.url) ?? null;
}

export function toFeedItem(article: Article): FeedItem {
  const published = article.published_at ?? article.updated_at ?? article.created_at;
  return {
    id: article.id,
    title: article.meta_title || article.title,
    url: articleUrl(article),
    summary: article.meta_description ?? "",
    html: article.content ?? "",
    image: articleImage(article),
    language: article.language,
    published,
    updated: article.updated_at ?? published,
  };
}

const xml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** CDATA can't contain "]]>", so it's split across two sections. */
const cdata = (value: string) => `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

/** RSS 2.0, full article HTML in content:encoded. */
export function renderRss(site: Site, items: FeedItem[], selfUrl: string): string {
  const entries = items
    .map(
      (item) => `    <item>
      <title>${xml(item.title)}</title>${item.url ? `\n      <link>${xml(item.url)}</link>` : ""}
      <guid isPermaLink="false">rankoya-article-${item.id}</guid>
      <pubDate>${new Date(item.published).toUTCString()}</pubDate>
      <description>${xml(item.summary)}</description>
      <content:encoded>${cdata(item.html)}</content:encoded>${
        item.image ? `\n      <enclosure url="${xml(item.image)}" type="image/jpeg" length="0" />` : ""
      }
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(site.name)}</title>
    <link>${xml(site.url)}</link>
    <description>${xml(`Articles from ${site.name}`)}</description>
    <language>${xml(site.language ?? "en")}</language>
    <atom:link href="${xml(selfUrl)}" rel="self" type="application/rss+xml" />
    <generator>Rankoya</generator>
${entries}
  </channel>
</rss>
`;
}

/** JSON Feed 1.1 (jsonfeed.org): the easy one for Lovable and Replit apps to read. */
export function renderJsonFeed(site: Site, items: FeedItem[], selfUrl: string) {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: site.name,
    home_page_url: site.url,
    feed_url: selfUrl,
    language: site.language ?? "en",
    items: items.map((item) => ({
      id: `rankoya-article-${item.id}`,
      url: item.url ?? undefined,
      title: item.title,
      summary: item.summary,
      content_html: item.html,
      image: item.image ?? undefined,
      language: item.language ?? undefined,
      date_published: item.published,
      date_modified: item.updated,
    })),
  };
}
