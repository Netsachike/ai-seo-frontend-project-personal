"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpenIcon, CalendarRangeIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";

import type { ArticleResearchWithRelations, ContentPlanWithItems } from "@/types/types";
import { useContentPlans, useResearch, useResearchList } from "@/features/content/hooks";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { DetailList } from "@/components/brand/detail-list";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { Pager } from "@/components/brand/pager";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";
import { PreviewPageButton } from "@/components/crawl/page-inspector";

const statusVariant = (status: string) =>
  status === "completed" || status === "active" || status === "published"
    ? "success"
    : status === "failed"
      ? "danger"
      : "neutral";

/** Text for an item of a free-form list from the API (strings or small objects). */
const itemText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "heading", "title", "question", "query", "name", "topic", "url", "domain"])
      if (typeof record[key] === "string") return record[key] as string;
    return JSON.stringify(value);
  }
  return String(value);
};

/** Every monthly content plan: period, cadence, target and how many items it holds. */
export function PlansPanel({ siteId }: { siteId: number }) {
  const t = useTranslations("content.plans");
  const format = useFormatter();
  const [page, setPage] = useQueryState("plp", parseAsInteger.withDefault(1));
  const query = useContentPlans(siteId, page);

  const columns = React.useMemo<DataColumn<ContentPlanWithItems>[]>(
    () => [
      { accessorKey: "name", header: t("name"), meta: { label: t("name"), pinned: true, className: "font-medium" } },
      {
        id: "period",
        accessorFn: (r) => r.period_start,
        header: t("period"),
        meta: { label: t("period") },
        cell: ({ row }) =>
          format.dateTimeRange(new Date(row.original.period_start), new Date(row.original.period_end), {
            dateStyle: "medium",
          }),
      },
      {
        id: "cadence",
        accessorFn: (r) => r.cadence ?? "",
        header: t("cadence"),
        meta: { label: t("cadence") },
        cell: ({ row }) => row.original.cadence ?? "—",
      },
      {
        id: "items",
        accessorFn: (r) => r.items.filter((i) => i.status !== "removed").length,
        header: t("items"),
        meta: { label: t("items"), numeric: true },
        cell: ({ row }) =>
          t("itemsValue", {
            planned: row.original.items.filter((i) => i.status !== "removed").length,
            target: row.original.articles_target ?? 0,
          }),
      },
      {
        id: "autopilot",
        accessorFn: (r) => (r.autopilot_enabled ? "on" : "off"),
        header: t("autopilot"),
        meta: { label: t("autopilot") },
        cell: ({ row }) => (
          <Badge variant={row.original.autopilot_enabled ? "success" : "neutral"}>
            {row.original.autopilot_enabled ? t("on") : t("off")}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        meta: { label: t("status") },
        cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>,
      },
    ],
    [t, format],
  );

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <DataTable
        caption={t("caption")}
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending}
        minWidth={860}
        getRowId={(r) => String(r.id)}
        csvFilename="content-plans.csv"
        empty={<EmptyState icon={CalendarRangeIcon} title={t("emptyTitle")} description={t("emptyBody")} compact />}
      />
      <Pager
        page={page}
        lastPage={query.data?.last_page ?? 1}
        onPage={(p) => void setPage(p)}
        busy={query.isFetching}
      />
    </div>
  );
}

/** Research briefs: the SERP analysis Rankoya writes each article from. */
export function BriefsPanel({ siteId }: { siteId: number }) {
  const t = useTranslations("content.briefs");
  const format = useFormatter();
  const [page, setPage] = useQueryState("brp", parseAsInteger.withDefault(1));
  const [openId, setOpenId] = useQueryState("brief", parseAsInteger);
  const query = useResearchList(siteId, page);

  const columns = React.useMemo<DataColumn<ArticleResearchWithRelations>[]>(
    () => [
      {
        id: "keyword",
        accessorFn: (r) => r.keyword?.keyword ?? "",
        header: t("keyword"),
        meta: { label: t("keyword"), pinned: true },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => void setOpenId(row.original.id)}
            className="text-start text-small font-medium text-fg hover:text-blue hover:underline"
          >
            {row.original.keyword?.keyword ?? t("untitled")}
          </button>
        ),
      },
      {
        id: "intent",
        accessorFn: (r) => r.search_intent ?? "",
        header: t("intent"),
        meta: { label: t("intent") },
        cell: ({ row }) =>
          row.original.search_intent ? <Badge variant="outline">{row.original.search_intent}</Badge> : "—",
      },
      {
        id: "type",
        accessorFn: (r) => r.article_type ?? "",
        header: t("type"),
        meta: { label: t("type") },
        cell: ({ row }) => row.original.article_type ?? "—",
      },
      {
        id: "words",
        accessorFn: (r) => r.target_word_count ?? 0,
        header: t("words"),
        meta: { label: t("words"), numeric: true },
        cell: ({ getValue }) => format.number(getValue() as number),
      },
      {
        accessorKey: "status",
        header: t("status"),
        meta: { label: t("status") },
        cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>,
      },
      {
        id: "article",
        accessorFn: (r) => (r.article ? "yes" : "no"),
        header: t("article"),
        meta: { label: t("article") },
        cell: ({ row }) =>
          row.original.article ? <Badge variant="success">{t("written")}</Badge> : <Badge>{t("notWritten")}</Badge>,
      },
    ],
    [t, format, setOpenId],
  );

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <DataTable
        caption={t("caption")}
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending}
        minWidth={860}
        getRowId={(r) => String(r.id)}
        csvFilename="research-briefs.csv"
        empty={<EmptyState icon={BookOpenIcon} title={t("emptyTitle")} description={t("emptyBody")} compact />}
      />
      <Pager
        page={page}
        lastPage={query.data?.last_page ?? 1}
        onPage={(p) => void setPage(p)}
        busy={query.isFetching}
      />
      <BriefSheet siteId={siteId} id={openId} onClose={() => void setOpenId(null)} />
    </div>
  );
}

function BriefSheet({ siteId, id, onClose }: { siteId: number; id: number | null; onClose: () => void }) {
  const t = useTranslations("content.briefs");
  const { brandSlug } = useShell();
  const query = useResearch(siteId, id);
  const r = query.data;
  const lists: Array<[string, unknown[] | null | undefined]> = r
    ? [
        [t("headings"), r.recommended_headings],
        [t("questions"), r.related_questions],
        [t("topics"), r.recommended_topics],
        [t("gaps"), r.content_gaps],
        [t("entities"), r.entities],
        [t("searches"), r.related_searches],
        [t("competitorPages"), r.competitor_pages],
        [t("internalLinks"), r.internal_link_opportunities],
        [t("citations"), r.external_citation_opportunities],
      ]
    : [];
  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="end" className="gap-0 overflow-y-auto data-[side=end]:max-w-[600px]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{r?.keyword?.keyword ?? t("title")}</SheetTitle>
          <SheetDescription>{t("sheetDescription")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-5">
          {query.isPending ? (
            <Skeleton className="h-64" />
          ) : query.isError ? (
            <ErrorState compact onRetry={() => query.refetch()} />
          ) : (
            r && (
              <>
                <DetailList
                  items={[
                    { label: t("status"), value: r.status },
                    { label: t("intent"), value: r.search_intent },
                    { label: t("type"), value: r.article_type },
                    { label: t("words"), value: r.target_word_count },
                    { label: t("error"), value: r.error_message },
                  ]}
                />
                {r.crawl_page && (
                  <div>
                    <PreviewPageButton page={r.crawl_page} label={t("preview")} />
                  </div>
                )}
                {r.article && (
                  <Link
                    href={brandHref(brandSlug, `content/${r.article.id}`)}
                    className="text-small font-medium text-blue hover:underline"
                  >
                    {t("openArticle", { title: r.article.title })}
                  </Link>
                )}
                {r.research_summary && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-small font-semibold text-fg">{t("summary")}</h3>
                    <p className="text-small whitespace-pre-line text-fg-2">{r.research_summary}</p>
                  </section>
                )}
                {lists.map(
                  ([title, items]) =>
                    items &&
                    items.length > 0 && (
                      <section key={title} className="flex flex-col gap-2">
                        <h3 className="text-small font-semibold text-fg">{title}</h3>
                        <ul className="flex list-disc flex-col gap-1 ps-5 text-small text-fg-2">
                          {items.slice(0, 25).map((item, i) => (
                            <li key={i} className="break-words">
                              {itemText(item)}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ),
                )}
              </>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
