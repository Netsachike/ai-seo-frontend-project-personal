"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLinkIcon, SendIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";

import type { PublicationWithRelations } from "@/types/types";
import { usePublicationsPage } from "@/features/publishing/hooks";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { Pager } from "@/components/brand/pager";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";
import { PublicationStatus } from "./[articleId]/publish-panels";

/** Every publish attempt, newest first: where it went, whether it went live, and why not. */
export function PublicationsPanel({ siteId }: { siteId: number }) {
  const t = useTranslations("articles.publications");
  const format = useFormatter();
  const { brandSlug } = useShell();
  const [page, setPage] = useQueryState("pp", parseAsInteger.withDefault(1));
  const query = usePublicationsPage(siteId, page);

  const columns = React.useMemo<DataColumn<PublicationWithRelations>[]>(
    () => [
      {
        id: "article",
        accessorFn: (r) => r.article?.title ?? "",
        header: t("article"),
        meta: { label: t("article"), pinned: true },
        cell: ({ row }) => (
          <Link
            href={brandHref(brandSlug, `articles/${row.original.article_id}`)}
            className="font-medium text-fg hover:text-blue hover:underline"
          >
            {row.original.article?.title ?? `#${row.original.article_id}`}
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        meta: { label: t("status") },
        cell: ({ row }) => <PublicationStatus status={row.original.status} />,
      },
      {
        id: "connection",
        accessorFn: (r) => r.connection?.name ?? "",
        header: t("connection"),
        meta: { label: t("connection") },
        cell: ({ row }) => row.original.connection?.name ?? "—",
      },
      {
        id: "url",
        accessorFn: (r) => r.published_url ?? r.error_message ?? "",
        header: t("url"),
        meta: { label: t("url") },
        cell: ({ row }) =>
          row.original.published_url ? (
            <a
              href={row.original.published_url}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="inline-flex max-w-[320px] items-center gap-1 truncate font-mono text-[12px] text-blue hover:underline"
            >
              <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
              <span className="truncate">{row.original.published_url}</span>
            </a>
          ) : row.original.error_message ? (
            <span className="line-clamp-2 max-w-[320px] text-caption font-normal text-danger">
              {row.original.error_message}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "when",
        accessorFn: (r) => r.published_at ?? r.created_at,
        header: t("when"),
        meta: { label: t("when"), numeric: true },
        cell: ({ getValue }) => format.dateTime(new Date(getValue() as string), "medium"),
      },
    ],
    [t, format, brandSlug],
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
        csvFilename="publications.csv"
        empty={<EmptyState icon={SendIcon} title={t("emptyTitle")} description={t("emptyBody")} compact />}
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
    </div>
  );
}
