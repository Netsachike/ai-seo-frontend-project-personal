"use client";

import * as React from "react";
import { CalendarRangeIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";

import type { ContentPlanWithItems } from "@/types/types";
import { statusVariant, useContentPlans } from "@/features/content/hooks";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { Pager } from "@/components/brand/pager";

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
