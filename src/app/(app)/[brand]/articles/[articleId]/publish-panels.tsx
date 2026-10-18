"use client";

import { ExternalLinkIcon, Link2Icon, LocateFixedIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { ArticleWithRelations, PublicationWithRelations } from "@/types/types";
import { isManualPublication, publicationVariant } from "@/features/publishing/hooks";
import { internalLinkKey, isInternalHref } from "@/lib/internal-links";
import { INTERNAL_LINK_ATTR } from "@/components/editor/article-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/brand/copy-button";

const KNOWN_PUBLICATION_STATUSES = [
  "published",
  "ready_for_manual_publish",
  "failed",
  "publishing",
  "pending",
] as const;
type KnownPublicationStatus = (typeof KNOWN_PUBLICATION_STATUSES)[number];
const isKnown = (status: string): status is KnownPublicationStatus =>
  (KNOWN_PUBLICATION_STATUSES as readonly string[]).includes(status);

/** A publication status in words; unknown statuses are shown as the API sends them. */
export function PublicationStatus({ status }: { status: string }) {
  const t = useTranslations("editor.publication.status");
  return <Badge variant={publicationVariant(status)}>{isKnown(status) ? t(status) : status}</Badge>;
}

/** Where the article went live, and every publish attempt we can see. */
export function PublicationCard({ publications }: { publications: PublicationWithRelations[] }) {
  const t = useTranslations("editor.publication");
  const format = useFormatter();
  const [latest, ...older] = publications;
  if (!latest) return null;
  const when = latest.published_at ?? latest.created_at;

  return (
    <Card className="gap-4">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>{t("title")}</CardTitle>
        <PublicationStatus status={latest.status} />
      </div>

      {latest.published_url ? (
        <div className="flex flex-col gap-2">
          <a
            href={latest.published_url}
            target="_blank"
            rel="noreferrer"
            dir="ltr"
            className="text-start font-mono text-[13px] break-all text-blue hover:underline"
          >
            {latest.published_url}
          </a>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <a href={latest.published_url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                {t("open")}
              </a>
            </Button>
            <CopyButton value={latest.published_url} label={t("copyUrl")} />
          </div>
        </div>
      ) : (
        <p className="text-small text-fg-2">
          {isManualPublication(latest) ? t("manualNoUrl") : latest.status === "failed" ? t("failedNoUrl") : t("noUrl")}
        </p>
      )}

      {latest.error_message && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-small text-danger">
          {latest.error_message}
        </p>
      )}

      <p className="text-caption font-normal text-fg-3">
        {t("via", {
          connection: latest.connection?.name ?? `#${latest.publishing_connection_id}`,
          date: format.dateTime(new Date(when), "medium"),
        })}
      </p>

      {older.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <span className="text-overline text-fg-3">{t("history", { count: older.length })}</span>
          <ul className="flex flex-col gap-1.5">
            {older.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-caption font-normal text-fg-2">
                <PublicationStatus status={p.status} />
                <span>{format.dateTime(new Date(p.published_at ?? p.created_at), "medium")}</span>
                {p.published_url && (
                  <a href={p.published_url} target="_blank" rel="noreferrer" className="text-blue hover:underline">
                    {t("open")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/**
 * A manual connection publishes nothing: the backend only prepares the
 * article. Everything needed to paste it into the CMS, one copy button each.
 */
export function ManualPublishCard({
  title,
  metaTitle,
  metaDescription,
  slug,
  html,
}: {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  html: string;
}) {
  const t = useTranslations("editor.manual");
  const fields = [
    { key: "title", value: title },
    { key: "metaTitle", value: metaTitle },
    { key: "metaDescription", value: metaDescription },
    { key: "slug", value: slug },
  ] as const;

  return (
    <Card className="gap-4 border-warning">
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-small text-fg-2">{t("body")}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {fields.map((f) => (
          <li key={f.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-overline text-fg-3">{t(`fields.${f.key}`)}</span>
              <CopyButton value={f.value} iconOnly label={t("copyField", { field: t(`fields.${f.key}`) })} />
            </div>
            <p dir="auto" className="truncate rounded-md bg-surface-2 px-2.5 py-1.5 text-small text-fg">
              {f.value || "—"}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={html} label={t("copyHtml")} />
        <CopyButton value={htmlToText(html)} label={t("copyText")} />
      </div>
    </Card>
  );
}

const htmlToText = (html: string) =>
  html
    .replace(/<\/(p|h[1-6]|li|div|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export type InternalLink = {
  url: string;
  anchor: string | null;
  /** The page it points to, matching the editor's `data-internal-link`. */
  key: string;
  /** Whether the body links to it, so it can be found in the article. */
  inArticle: boolean;
};
type RawLink = Pick<InternalLink, "url" | "anchor">;

/** A link from the API's `internal_links`, whatever shape the item has. */
function linkOf(item: unknown): RawLink | null {
  if (typeof item === "string") return item ? { url: item, anchor: null } : null;
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const pick = (...keys: string[]) => keys.map((k) => o[k]).find((v): v is string => typeof v === "string" && !!v);
  const url = pick("url", "href", "target_url", "link", "target");
  return url ? { url, anchor: pick("anchor", "anchor_text", "text", "title", "label") ?? null } : null;
}

/** Links in the HTML that stay on the site: relative, or to the site's own host. */
function linksInHtml(html: string, domain: string): RawLink[] {
  const links: RawLink[] = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].trim();
    if (isInternalHref(href, domain))
      links.push({ url: href, anchor: match[2].replace(/<[^>]+>/g, "").trim() || null });
  }
  return links;
}

/**
 * The article's internal links: the backend's list, else the on-site links
 * in the body. `html` is the live body, so edits show up straight away.
 */
export function internalLinksOf(article: ArticleWithRelations, html: string, domain: string): InternalLink[] {
  const inBody = linksInHtml(html, domain);
  const bodyKeys = new Set(inBody.map((l) => internalLinkKey(l.url, domain)));
  const fromApi = (article.internal_links ?? []).map(linkOf).filter((l): l is RawLink => l !== null);
  const seen = new Set<string>();
  return (fromApi.length ? fromApi : inBody).flatMap((l) => {
    const key = internalLinkKey(l.url, domain);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...l, key, inArticle: bodyKeys.has(key) }];
  });
}

/** Scrolls the editor to the first place the body links to `key`, and highlights it briefly. */
function locateInArticle(key: string) {
  const target = [...document.querySelectorAll<HTMLElement>(`[${INTERNAL_LINK_ATTR}]`)].find(
    (el) => el.getAttribute(INTERNAL_LINK_ATTR) === key,
  );
  if (!target) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  target.classList.add("is-located");
  window.setTimeout(() => target.classList.remove("is-located"), 1600);
}

/** Absolute URL for an internal link, so it opens on the live site. */
const absolute = (url: string, domain: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${domain}${url.startsWith("/") ? "" : "/"}${url}`;

/** The pages on the site this article links to. */
export function InternalLinksCard({ links, domain }: { links: InternalLink[]; domain: string }) {
  const t = useTranslations("editor.internalLinks");
  return (
    <Card className="gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>{t("title")}</CardTitle>
        <span className="num text-caption font-normal text-fg-3">{t("count", { count: links.length })}</span>
      </div>
      {links.length === 0 ? (
        <p className="text-small text-fg-2">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.url} className="flex items-start gap-2">
              <Link2Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fg-3" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex min-w-0 flex-col">
                  {link.anchor && (
                    <span dir="auto" className="truncate text-small text-fg">
                      {link.anchor}
                    </span>
                  )}
                  <span dir="ltr" className="truncate text-start font-mono text-[12px] text-fg-2">
                    {link.key}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <Button asChild size="sm" variant="secondary">
                    <a href={absolute(link.url, domain)} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon />
                      {t("viewLive")}
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!link.inArticle}
                    title={link.inArticle ? undefined : t("notInBody")}
                    onClick={() => locateInArticle(link.key)}
                  >
                    <LocateFixedIcon />
                    {t("showInArticle")}
                  </Button>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
