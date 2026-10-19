"use client";

import * as React from "react";
import { CircleDollarSignIcon, ExternalLinkIcon, MonitorIcon, ScanSearchIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { CrawlPage, MoneyPageWithRelations, Priority } from "@/types/types";
import { PreviewPageButton, WithPagePreview } from "@/components/crawl/page-inspector";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toNumber } from "@/services/api/helpers";
import {
  useAnalyzeMoneyPages,
  useMoneyPage,
  useMoneyPageRecommendations,
  useMoneyPages,
} from "@/features/money-pages/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { DetailList } from "@/components/brand/detail-list";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { Pager } from "@/components/brand/pager";
import { useShell } from "@/components/layout/shell-context";

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

export const priorityBadge: Record<Priority, "danger" | "warning" | "blue" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "blue",
  low: "neutral",
};

const scoreTone = (score: number) => (score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-fg-2");

/** Text for an item of a free-form list from the API (strings or small objects). */
const itemText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["title", "label", "name", "signal", "url", "keyword", "description"])
      if (typeof record[key] === "string") return record[key] as string;
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Money pages, shown as a tab on Site audit: the pages that bring in revenue
 * (services, products, pricing), ranked by commercial score, each with
 * Rankoya's recommendations to make it rank and convert better.
 */
export function MoneyPanel() {
  const t = useTranslations("money");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { brand } = useShell();
  const siteId = brand?.id ?? 0;
  // `mpage`: Site audit's issue list already uses `page`.
  const [page, setPage] = useQueryState("mpage", parseAsInteger.withDefault(1));
  const [openId, setOpenId] = useQueryState("open", parseAsInteger);
  const query = useMoneyPages(siteId, page);
  const analyze = useAnalyzeMoneyPages(siteId);
  const [preview, setPreview] = React.useState<CrawlPage | null>(null);

  const run = () =>
    analyze.mutate(undefined, {
      onSuccess: (result) => toast.success(t("analyzed", { count: result.money_pages_found })),
      onError: (error) => toast.error(getErrorMessage(error, t("analyzeFailed"))),
    });

  const columns = React.useMemo<DataColumn<MoneyPageWithRelations>[]>(
    () => [
      {
        id: "page",
        accessorFn: (r) => r.name ?? r.crawl_page?.url ?? "",
        header: t("columns.page"),
        meta: {
          label: t("columns.page"),
          pinned: true,
          csv: (r) => (r as MoneyPageWithRelations).crawl_page?.url ?? "",
        },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => void setOpenId(row.original.id)}
            className="flex max-w-[22rem] flex-col items-start gap-0.5 text-start"
          >
            <span className="w-full truncate text-small font-medium text-fg hover:text-blue hover:underline">
              {row.original.name ?? row.original.crawl_page?.title ?? t("untitled")}
            </span>
            {row.original.crawl_page && (
              <span className="w-full truncate text-caption font-normal text-fg-3">
                {pathOf(row.original.crawl_page.url)}
              </span>
            )}
          </button>
        ),
      },
      {
        id: "preview",
        header: () => <span className="sr-only">{t("preview")}</span>,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.crawl_page && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("preview")}
              onClick={() => setPreview(row.original.crawl_page as CrawlPage)}
            >
              <MonitorIcon />
            </Button>
          ),
      },
      {
        id: "score",
        accessorFn: (r) => toNumber(r.commercial_score) ?? 0,
        header: t("columns.score"),
        meta: { label: t("columns.score"), numeric: true },
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return <span className={cn("num font-semibold", scoreTone(v))}>{Math.round(v)}</span>;
        },
      },
      {
        id: "role",
        accessorFn: (r) => r.page_role ?? "",
        header: t("columns.role"),
        meta: { label: t("columns.role") },
        cell: ({ row }) => (row.original.page_role ? <Badge variant="outline">{row.original.page_role}</Badge> : "—"),
      },
      {
        id: "intent",
        accessorFn: (r) => r.intent ?? "",
        header: t("columns.intent"),
        meta: { label: t("columns.intent") },
        cell: ({ row }) => (row.original.intent ? <Badge variant="blue">{row.original.intent}</Badge> : "—"),
      },
      {
        id: "keyword",
        accessorFn: (r) => r.primary_keyword?.keyword ?? "",
        header: t("columns.keyword"),
        meta: { label: t("columns.keyword") },
        cell: ({ row }) => (
          <span className="block max-w-[14rem] truncate">{row.original.primary_keyword?.keyword ?? "—"}</span>
        ),
      },
      {
        id: "signals",
        accessorFn: (r) => r.conversion_signals?.length ?? 0,
        header: t("columns.signals"),
        meta: { label: t("columns.signals"), numeric: true },
      },
      {
        id: "analyzed",
        accessorFn: (r) => r.last_analyzed_at ?? "",
        header: t("columns.analyzed"),
        meta: { label: t("columns.analyzed") },
        cell: ({ row }) =>
          row.original.last_analyzed_at ? format.relativeTime(new Date(row.original.last_analyzed_at), now) : "—",
      },
    ],
    [t, format, now, setOpenId],
  );

  if (!brand) return <Skeleton className="h-64" />;
  const rows = query.data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-small text-fg-2">{t("description", { domain: brand.domain })}</p>
        <Button variant="secondary" onClick={run} loading={analyze.isPending}>
          <ScanSearchIcon />
          {rows.length ? t("reanalyze") : t("analyze")}
        </Button>
      </div>
      {query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (
        <WithPagePreview page={preview} onClose={() => setPreview(null)}>
          <DataTable
            caption={t("caption")}
            data={rows}
            columns={columns}
            loading={query.isPending}
            minWidth={preview ? 720 : 980}
            getRowId={(r) => String(r.id)}
            csvFilename="money-pages.csv"
            empty={
              <EmptyState
                icon={CircleDollarSignIcon}
                title={t("emptyTitle")}
                description={t("emptyBody")}
                action={
                  <Button size="sm" variant="secondary" onClick={run} loading={analyze.isPending}>
                    {t("analyze")}
                  </Button>
                }
                compact
              />
            }
            toolbar={
              query.data && <span className="num text-small text-fg-2">{t("total", { count: query.data.total })}</span>
            }
          />
          <Pager
            page={page}
            lastPage={query.data?.last_page ?? 1}
            onPage={(p) => void setPage(p)}
            busy={query.isFetching}
          />
        </WithPagePreview>
      )}
      <MoneyPageSheet siteId={siteId} id={openId} onClose={() => void setOpenId(null)} />
    </div>
  );
}

function MoneyPageSheet({ siteId, id, onClose }: { siteId: number; id: number | null; onClose: () => void }) {
  const t = useTranslations("money.detail");
  const tPriority = useTranslations("money.priority");
  const detail = useMoneyPage(siteId, id);
  const recs = useMoneyPageRecommendations(siteId, id);
  const page = detail.data;
  const lists: Array<[string, unknown[] | null | undefined]> = [
    [t("signals"), page?.conversion_signals],
    [t("supporting"), page?.supporting_content],
    [t("links"), page?.internal_link_opportunities],
  ];

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="end" className="gap-0 overflow-y-auto data-[side=end]:max-w-[560px]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{page?.name ?? recs.data?.money_page.name ?? t("title")}</SheetTitle>
          <SheetDescription>
            {page?.crawl_page && (
              <a
                href={page.crawl_page.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-blue hover:underline"
              >
                {page.crawl_page.url}
                <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0" />
              </a>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-5">
          {page?.crawl_page && <PreviewPageButton page={page.crawl_page} label={t("preview")} />}
          {detail.isPending ? (
            <Skeleton className="h-32" />
          ) : detail.isError ? (
            <ErrorState compact onRetry={() => detail.refetch()} />
          ) : (
            page && (
              <DetailList
                items={[
                  { label: t("score"), value: Math.round(toNumber(page.commercial_score) ?? 0) },
                  { label: t("role"), value: page.page_role },
                  { label: t("intent"), value: page.intent },
                  { label: t("keyword"), value: page.primary_keyword?.keyword },
                  { label: t("status"), value: page.status },
                ]}
              />
            )
          )}

          <section className="flex flex-col gap-3">
            <h3 className="text-small font-semibold text-fg">
              {t("recommendations", { count: recs.data?.summary.total_recommendations ?? 0 })}
            </h3>
            {recs.isPending ? (
              <Skeleton className="h-40" />
            ) : recs.isError ? (
              <ErrorState compact onRetry={() => recs.refetch()} />
            ) : recs.data && recs.data.recommendations.length === 0 ? (
              <p className="text-small text-fg-2">{t("noRecommendations")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {recs.data?.recommendations.map((rec, i) => (
                  <li key={`${rec.type}-${i}`} className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                    <div className="flex items-start gap-2">
                      <Badge variant={priorityBadge[rec.priority] ?? "neutral"} className="mt-0.5">
                        {tPriority(rec.priority)}
                      </Badge>
                      <span className="text-small font-medium text-fg">{rec.title}</span>
                    </div>
                    {rec.description && <p className="text-small text-fg-2">{rec.description}</p>}
                    {(rec.recommended_action || rec.action) && (
                      <p className="text-small text-fg">
                        <span className="font-medium">{t("todo")}</span> {rec.recommended_action || rec.action}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {recs.data && recs.data.workflow.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="text-small font-semibold text-fg">{t("workflow")}</h3>
              <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-small text-fg-2">
                {recs.data.workflow.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          {lists.map(
            ([title, items]) =>
              items &&
              items.length > 0 && (
                <section key={title} className="flex flex-col gap-2">
                  <h3 className="text-small font-semibold text-fg">{title}</h3>
                  <ul className="flex list-disc flex-col gap-1 ps-5 text-small text-fg-2">
                    {items.slice(0, 20).map((item, i) => (
                      <li key={i} className="break-words">
                        {itemText(item)}
                      </li>
                    ))}
                  </ul>
                </section>
              ),
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
