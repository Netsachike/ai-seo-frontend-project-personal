"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpenIcon, FilePenLineIcon, RotateCcwIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ArticleResearchWithRelations } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import {
  statusVariant,
  useGenerateArticle,
  useResearch,
  useResearchKeyword,
  useResearchList,
} from "@/features/content/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/**
 * Write the article from a completed brief, retry a failed one, or open the
 * article already written. Briefs still running have no action.
 */
function useBriefActions(siteId: number) {
  const t = useTranslations("articles.research");
  const router = useRouter();
  const { brandSlug } = useShell();
  const generate = useGenerateArticle(siteId);
  const retry = useResearchKeyword(siteId);

  const write = (brief: ArticleResearchWithRelations) =>
    generate.mutate(brief.id, {
      onSuccess: (article) => {
        toast.success(t("written", { title: article.title }));
        router.push(brandHref(brandSlug, `articles/${article.id}`));
      },
      onError: (error) => toast.error(getErrorMessage(error, t("writeFailed"))),
    });

  const rerun = (brief: ArticleResearchWithRelations) =>
    retry.mutate(brief.keyword_id, {
      onSuccess: () => toast.success(t("retried", { keyword: brief.keyword?.keyword ?? "" })),
      onError: (error) => toast.error(getErrorMessage(error, t("retryFailed"))),
    });

  const busy = generate.isPending || retry.isPending;
  const busyId = generate.isPending ? generate.variables : retry.isPending ? retry.variables : null;

  const renderAction = (brief: ArticleResearchWithRelations) => {
    if (brief.article)
      return (
        <Button asChild size="sm" variant="ghost">
          <Link href={brandHref(brandSlug, `articles/${brief.article.id}`)}>{t("open")}</Link>
        </Button>
      );
    if (brief.status === "completed") {
      const mine = generate.isPending && busyId === brief.id;
      return (
        <Button size="sm" variant="primary" loading={mine} disabled={busy && !mine} onClick={() => write(brief)}>
          <FilePenLineIcon />
          {mine ? t("writing") : t("write")}
        </Button>
      );
    }
    if (brief.status === "failed") {
      const mine = retry.isPending && busyId === brief.keyword_id;
      return (
        <Button size="sm" variant="secondary" loading={mine} disabled={busy && !mine} onClick={() => rerun(brief)}>
          <RotateCcwIcon />
          {t("retry")}
        </Button>
      );
    }
    return null;
  };

  return { renderAction, busy: generate.isPending };
}

/** Research briefs: the SERP analysis each article is written from. A completed brief can be written up. */
export function ResearchPanel({ siteId }: { siteId: number }) {
  const t = useTranslations("articles.research");
  const format = useFormatter();
  const [page, setPage] = useQueryState("brp", parseAsInteger.withDefault(1));
  const [openId, setOpenId] = useQueryState("brief", parseAsInteger);
  const query = useResearchList(siteId, page);
  const { renderAction, busy } = useBriefActions(siteId);

  const columns: DataColumn<ArticleResearchWithRelations>[] = [
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
      id: "actions",
      header: () => <span className="sr-only">{t("actions")}</span>,
      enableSorting: false,
      cell: ({ row }) => renderAction(row.original),
    },
  ];

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      {busy && (
        <p role="status" className="rounded-lg bg-surface-2 px-4 py-3 text-small text-fg-2">
          {t("writingNote")}
        </p>
      )}
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
      <BriefSheet siteId={siteId} id={openId} onClose={() => void setOpenId(null)} renderAction={renderAction} />
    </div>
  );
}

function BriefSheet({
  siteId,
  id,
  onClose,
  renderAction,
}: {
  siteId: number;
  id: number | null;
  onClose: () => void;
  renderAction: (brief: ArticleResearchWithRelations) => React.ReactNode;
}) {
  const t = useTranslations("articles.research");
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
                    { label: t("researchId"), value: r.id },
                    { label: t("status"), value: r.status },
                    { label: t("intent"), value: r.search_intent },
                    { label: t("type"), value: r.article_type },
                    { label: t("words"), value: r.target_word_count },
                    { label: t("error"), value: r.error_message },
                  ]}
                />
                <div className="flex flex-wrap items-center gap-2">
                  {renderAction(r)}
                  {r.crawl_page && <PreviewPageButton page={r.crawl_page} label={t("preview")} />}
                </div>
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
