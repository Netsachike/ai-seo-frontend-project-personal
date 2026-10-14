"use client";

import * as React from "react";
import { FileSearchIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";

import type { CrawlPage } from "@/types/types";
import type { AuditRow } from "@/features/audit/hooks";
import { useCrawlPages } from "@/features/audit/crawl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { Pager } from "@/components/brand/pager";
import { WithPagePreview, pathOf, statusVariant } from "@/components/crawl/page-inspector";

/**
 * Every page the latest crawl fetched (50 per page), with what is missing and
 * how many issues it has. Opening a page shows it beside the table on wide
 * screens (live preview, crawled HTML, details) and in a drawer otherwise.
 */
export function PagesPanel({ siteId, runId, issues }: { siteId: number; runId: number | null; issues: AuditRow[] }) {
  const t = useTranslations("audit.crawledPages");
  const format = useFormatter();
  const [page, setPage] = useQueryState("pp", parseAsInteger.withDefault(1));
  const query = useCrawlPages(siteId, runId, page);
  const [open, setOpen] = React.useState<CrawlPage | null>(null);
  const openId = open?.id ?? null;

  const issuesByPage = React.useMemo(() => {
    const map = new Map<number, AuditRow[]>();
    for (const issue of issues) {
      if (issue.crawlPageId === null) continue;
      map.set(issue.crawlPageId, [...(map.get(issue.crawlPageId) ?? []), issue]);
    }
    return map;
  }, [issues]);

  const columns = React.useMemo<DataColumn<CrawlPage>[]>(
    () => [
      {
        id: "page",
        accessorFn: (row) => row.url,
        header: t("page"),
        meta: { label: t("page"), pinned: true, csv: (row) => (row as CrawlPage).url },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setOpen(row.original)}
            aria-pressed={row.original.id === openId}
            className={cn(
              "-mx-2 flex max-w-[22rem] flex-col items-start gap-0.5 rounded-md px-2 py-1 text-start",
              row.original.id === openId && "bg-blue-bg",
            )}
          >
            <span className="w-full truncate text-small font-medium text-fg hover:text-blue hover:underline">
              {pathOf(row.original.url)}
            </span>
            <span className="w-full truncate text-caption font-normal text-fg-3">
              {row.original.title ?? t("noTitle")}
            </span>
          </button>
        ),
      },
      {
        accessorKey: "status_code",
        header: t("status"),
        meta: { label: t("status"), numeric: true },
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status_code)}>{row.original.status_code ?? "—"}</Badge>
        ),
      },
      {
        id: "meta",
        accessorFn: (row) => row.meta_description?.length ?? 0,
        header: t("meta"),
        meta: { label: t("meta"), csv: (row) => (row as CrawlPage).meta_description ?? "" },
        cell: ({ row }) =>
          row.original.meta_description ? (
            <span className="num text-small text-fg-2">
              {t("chars", { count: row.original.meta_description.length })}
            </span>
          ) : (
            <Badge variant="danger">{t("missing")}</Badge>
          ),
      },
      {
        id: "h1",
        accessorFn: (row) => row.h1 ?? "",
        header: t("h1"),
        meta: { label: t("h1") },
        cell: ({ row }) =>
          row.original.h1 ? (
            <span className="block max-w-[14rem] truncate text-small text-fg-2">{row.original.h1}</span>
          ) : (
            <Badge variant="danger">{t("missing")}</Badge>
          ),
      },
      {
        accessorKey: "word_count",
        header: t("words"),
        meta: { label: t("words"), numeric: true },
        cell: ({ row }) => (row.original.word_count === null ? "—" : format.number(row.original.word_count)),
      },
      {
        id: "indexable",
        accessorFn: (row) => (row.indexable === null ? "" : row.indexable ? "yes" : "no"),
        header: t("indexable"),
        meta: { label: t("indexable") },
        cell: ({ row }) =>
          row.original.indexable === null ? (
            "—"
          ) : (
            <Badge variant={row.original.indexable ? "success" : "warning"}>
              {row.original.indexable ? t("yes") : t("no")}
            </Badge>
          ),
      },
      {
        id: "issues",
        accessorFn: (row) => issuesByPage.get(row.id)?.length ?? 0,
        header: t("issues"),
        meta: { label: t("issues"), numeric: true },
        cell: ({ getValue }) => {
          const n = getValue() as number;
          return <span className={cn("num", n > 0 ? "font-semibold text-warning" : "text-fg-3")}>{n}</span>;
        },
      },
    ],
    [t, format, issuesByPage, openId],
  );

  if (!runId) {
    return <EmptyState icon={FileSearchIcon} title={t("noCrawlTitle")} description={t("noCrawlBody")} />;
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  return (
    <WithPagePreview page={open} issues={open ? (issuesByPage.get(open.id) ?? []) : []} onClose={() => setOpen(null)}>
      <DataTable
        caption={t("caption")}
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending}
        minWidth={open ? 640 : 900}
        getRowId={(row) => String(row.id)}
        csvFilename="crawled-pages.csv"
        empty={<EmptyState icon={FileSearchIcon} title={t("emptyTitle")} description={t("emptyBody")} compact />}
        toolbar={
          query.data && <span className="num text-small text-fg-2">{t("total", { count: query.data.meta.total })}</span>
        }
      />
      <Pager
        page={page}
        lastPage={query.data?.meta.last_page ?? 1}
        onPage={(p) => void setPage(p)}
        busy={query.isFetching}
      />
    </WithPagePreview>
  );
}
