"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLinkIcon, MonitorIcon, RotateCwIcon, SmartphoneIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { CrawlPage } from "@/types/types";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

import { siteGuardKeys } from "@/lib/api/query-keys";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import siteGuardService from "@/services/site-guard";
import { severityBadge, toAuditRow, type AuditRow } from "@/features/audit/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailList } from "@/components/brand/detail-list";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";

export const pathOf = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return url;
  }
};

export function statusVariant(code: number | null): "success" | "warning" | "danger" | "neutral" {
  if (code === null) return "neutral";
  if (code >= 200 && code < 300) return "success";
  if (code >= 300 && code < 400) return "warning";
  return "danger";
}

type Heading = { level?: number | string; tag?: string; text?: string };
type Image = { src?: string; alt?: string | null };
type View = "live" | "crawled" | "details";

/**
 * The crawled HTML as a static document: a `<base>` so its stylesheets,
 * images and links resolve against the real site. Rendered without scripts.
 */
function crawledDocument(page: CrawlPage) {
  const html = page.content ?? "";
  const base = `<base href="${page.url.replace(/"/g, "&quot;")}" target="_blank">`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${base}`) : `${base}${html}`;
}

/**
 * The page's issues: the ones passed in, or the site's first page of Site
 * Guard issues (the audit summary, shared through the query cache) filtered to
 * this page.
 */
function usePageIssues(page: CrawlPage | null, provided?: AuditRow[]) {
  const { brand } = useShell();
  const siteId = brand?.id ?? 0;
  const summary = useQuery({
    queryKey: siteGuardKeys.issues(siteId),
    enabled: Boolean(siteId && page && !provided),
    queryFn: async () => (await siteGuardService.issues(siteId)).data,
  });
  if (provided) return provided;
  if (!page) return [];
  return (summary.data?.data ?? []).filter((issue) => issue.crawl_page_id === page.id).map(toAuditRow);
}

/**
 * One crawled page next to the table: a preview of the live page (or of the
 * HTML the crawler read, for sites that refuse to be framed) and everything
 * the crawler found on it.
 */
export function CrawlPageInspector({
  page,
  issues: providedIssues,
  onClose,
  className,
}: {
  page: CrawlPage;
  /** Leave out to look them up from the site's audit. */
  issues?: AuditRow[];
  onClose: () => void;
  className?: string;
}) {
  const t = useTranslations("audit.page");
  const issues = usePageIssues(page, providedIssues);
  const [view, setView] = React.useState<View>("live");
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [reload, setReload] = React.useState(0);
  const hasCrawled = Boolean(page.content?.trim());

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card",
        className,
      )}
    >
      <header className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(page.status_code)}>{page.status_code ?? t("noStatus")}</Badge>
              {page.page_type && <Badge variant="outline">{page.page_type}</Badge>}
              <Badge variant={issues.length ? "warning" : "success"}>
                {t("issuesTitle", { count: issues.length })}
              </Badge>
            </div>
            <h2 className="truncate text-small font-semibold text-fg" title={page.url}>
              {pathOf(page.url)}
            </h2>
          </div>
          <Button asChild variant="ghost" size="icon-sm">
            <a href={page.url} target="_blank" rel="noreferrer" aria-label={t("openNewTab")}>
              <ExternalLinkIcon />
            </a>
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={t("close")} onClick={onClose}>
            <XIcon />
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList variant="segmented" aria-label={t("viewLabel")}>
              <TabsTrigger value="live">{t("views.live")}</TabsTrigger>
              {hasCrawled && <TabsTrigger value="crawled">{t("views.crawled")}</TabsTrigger>}
              <TabsTrigger value="details">{t("views.details")}</TabsTrigger>
            </TabsList>
          </Tabs>
          {view !== "details" && (
            <div className="flex items-center gap-1">
              <Tabs value={device} onValueChange={(v) => setDevice(v as "desktop" | "mobile")}>
                <TabsList variant="segmented" aria-label={t("deviceLabel")}>
                  <TabsTrigger value="desktop" aria-label={t("desktop")}>
                    <MonitorIcon className="size-4" />
                  </TabsTrigger>
                  <TabsTrigger value="mobile" aria-label={t("mobile")}>
                    <SmartphoneIcon className="size-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="ghost" size="icon-sm" aria-label={t("reload")} onClick={() => setReload((n) => n + 1)}>
                <RotateCwIcon />
              </Button>
            </div>
          )}
        </div>
      </header>

      {view === "details" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <CrawlPageDetails page={page} issues={issues} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col bg-surface-2/60">
          <div className="flex min-h-0 flex-1 justify-center overflow-auto p-3">
            <iframe
              key={`${page.id}-${view}-${reload}`}
              title={t("previewTitle", { page: pathOf(page.url) })}
              className={cn(
                "h-full min-h-[480px] rounded-md border border-border bg-white",
                device === "mobile" ? "w-[390px] shrink-0" : "w-full",
              )}
              referrerPolicy="no-referrer"
              loading="lazy"
              {...(view === "live"
                ? { src: page.url, sandbox: "allow-scripts allow-same-origin allow-forms allow-popups" }
                : { srcDoc: crawledDocument(page), sandbox: "allow-popups allow-popups-to-escape-sandbox" })}
            />
          </div>
          <p className="border-t border-border px-4 py-2 text-caption font-normal text-fg-3">
            {view === "live" ? (hasCrawled ? t("liveHint") : t("liveHintNoCrawl")) : t("crawledHint")}
          </p>
        </div>
      )}
    </div>
  );
}

/** Small screens: the same inspector in a full-height drawer. */
export function CrawlPageSheet({
  page,
  issues,
  onOpenChange,
}: {
  page: CrawlPage | null;
  issues?: AuditRow[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={page !== null} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="gap-0 p-0 data-[side=end]:max-w-[640px]">
        {page && (
          <>
            <SheetTitle className="sr-only">{pathOf(page.url)}</SheetTitle>
            <CrawlPageInspector
              page={page}
              issues={issues}
              onClose={() => onOpenChange(false)}
              className="h-full rounded-none border-0 shadow-none"
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Everything the crawler read on one page, plus the issues found on it. */
export function CrawlPageDetails({ page, issues }: { page: CrawlPage; issues: AuditRow[] }) {
  const t = useTranslations("audit.page");
  const tSeverity = useTranslations("audit.severity");
  const format = useFormatter();
  const { brandSlug } = useShell();
  const headings = ((page.headings ?? []) as Heading[]).filter((h) => h.text);
  const images = (page.images ?? []) as Image[];
  const missingAlt = images.filter((img) => !img.alt?.trim()).length;
  const count = (text: string | null) => (text ? t("chars", { count: text.length }) : null);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-small font-semibold text-fg">{t("issuesTitle", { count: issues.length })}</h3>
        {issues.length === 0 ? (
          <p className="text-small text-fg-2">{t("noIssues")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2">
                <Badge variant={severityBadge[issue.severity]} className="mt-0.5">
                  {tSeverity(issue.severity)}
                </Badge>
                <Link
                  href={brandHref(brandSlug, `audit/${issue.id}`)}
                  className="text-small text-fg hover:text-blue hover:underline"
                >
                  {issue.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-small font-semibold text-fg">{t("seoTitle")}</h3>
        <DetailList
          items={[
            { label: t("title"), value: page.title ?? <Missing /> },
            { label: t("titleLength"), value: count(page.title) },
            { label: t("meta"), value: page.meta_description ?? <Missing /> },
            { label: t("metaLength"), value: count(page.meta_description) },
            { label: t("h1"), value: page.h1 ?? <Missing /> },
            { label: t("canonical"), value: page.canonical_url ?? <Missing />, mono: Boolean(page.canonical_url) },
            { label: t("indexable"), value: page.indexable === null ? null : page.indexable ? t("yes") : t("no") },
            { label: t("schema"), value: page.schema_types?.length ? page.schema_types.join(", ") : <Missing /> },
          ]}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-small font-semibold text-fg">{t("contentTitle")}</h3>
        <DetailList
          items={[
            { label: t("words"), value: page.word_count === null ? null : format.number(page.word_count) },
            {
              label: t("internalLinks"),
              value: page.internal_links_count === null ? null : format.number(page.internal_links_count),
            },
            {
              label: t("externalLinks"),
              value: page.external_links_count === null ? null : format.number(page.external_links_count),
            },
            {
              label: t("images"),
              value: images.length ? t("imagesValue", { count: images.length, missing: missingAlt }) : null,
            },
            { label: t("contentType"), value: page.content_type },
            { label: t("summary"), value: page.content_summary },
            { label: t("error"), value: page.error_message },
          ]}
        />
      </section>

      {headings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-small font-semibold text-fg">{t("headingsTitle", { count: headings.length })}</h3>
          <ol className="flex flex-col gap-1.5">
            {headings.slice(0, 40).map((h, i) => (
              <li key={i} className="flex gap-2 text-small">
                <span className="w-8 shrink-0 font-mono text-caption text-fg-3 uppercase">
                  {h.tag ?? (h.level ? `h${h.level}` : "")}
                </span>
                <span className="min-w-0 text-fg-2">{h.text}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Missing() {
  const t = useTranslations("audit.page");
  return <span className="font-medium text-danger">{t("missing")}</span>;
}

/**
 * A list with the page inspector beside it: side by side on wide screens
 * (sticky, so it stays in view while the list scrolls), a drawer otherwise.
 */
export function WithPagePreview({
  page,
  issues,
  onClose,
  children,
}: {
  page: CrawlPage | null;
  issues?: AuditRow[];
  onClose: () => void;
  children: React.ReactNode;
}) {
  const wide = useMediaQuery("(min-width: 1280px)");
  const split = wide && page !== null;
  return (
    <div className={cn("grid items-start gap-4", split && "grid-cols-[minmax(0,5fr)_minmax(0,7fr)]")}>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      {split && page && (
        <CrawlPageInspector
          key={page.id}
          page={page}
          issues={issues}
          onClose={onClose}
          className="sticky top-20 h-[calc(100dvh-7rem)]"
        />
      )}
      {!wide && <CrawlPageSheet page={page} issues={issues} onOpenChange={(open) => !open && onClose()} />}
    </div>
  );
}

/** "Preview page" for a crawled page shown inside another drawer or page: opens the inspector in its own drawer. */
export function PreviewPageButton({ page, label }: { page: CrawlPage; label: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <MonitorIcon />
        {label}
      </Button>
      <CrawlPageSheet page={open ? page : null} onOpenChange={setOpen} />
    </>
  );
}
