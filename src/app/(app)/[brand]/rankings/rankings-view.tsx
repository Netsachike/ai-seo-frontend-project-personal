"use client";

import * as React from "react";
import { PlusIcon, TrendingUpIcon } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";

import type { KeywordRanking } from "@/lib/mocks/ui-data";
import { cn } from "@/lib/utils";
import { useRange } from "@/features/insights/url-state";
import { useRankings } from "@/features/rankings/hooks";
import { GscPerformanceCard } from "@/features/search-console/gsc-performance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { DeltaChip } from "@/components/brand/delta-chip";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { RankCell } from "@/components/brand/rank-cell";
import { RankDistribution } from "@/components/charts/rank-distribution";
import { VisibilityTrend } from "@/components/charts/visibility-trend";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { brandHref } from "@/components/layout/nav";
import { RangePicker } from "@/components/layout/range-picker";
import { useShell } from "@/components/layout/shell-context";
import { AddKeywordsDialog } from "./add-keywords-dialog";

const devices = ["desktop", "mobile"] as const;
// Improved / declined need position history, which the API does not keep yet.
const views = ["all", "close"] as const;
type View = (typeof views)[number];

const inView = (row: KeywordRanking, view: View) => {
  if (view === "close") return row.position !== null && row.position > 10 && row.position <= 20;
  return true;
};

export function RankingsView() {
  const t = useTranslations("rankings");
  const format = useFormatter();
  const { brand, brandSlug } = useShell();
  const { days } = useRange();
  const [device, setDevice] = useQueryState("device", parseAsStringLiteral(devices).withDefault("desktop"));
  const [view, setView] = useQueryState("view", parseAsStringLiteral(views).withDefault("all"));
  const [adding, setAdding] = React.useState(false);
  const query = useRankings(brand?.id, device, days);

  if (!brand || query.isPending) return <PageSkeleton kpis={5} />;
  const data = query.data;
  const rows = data?.keywords.filter((r) => inView(r, view)) ?? [];
  const counts = Object.fromEntries(views.map((v) => [v, data?.keywords.filter((r) => inView(r, v)).length ?? 0]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description", { count: data?.tracked ?? 0 })}
        actions={
          <>
            <Tabs value={device} onValueChange={(v) => void setDevice(v as (typeof devices)[number])}>
              <TabsList variant="segmented" aria-label={t("device")}>
                <TabsTrigger value="desktop">{t("desktop")}</TabsTrigger>
                <TabsTrigger value="mobile">{t("mobile")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <RangePicker />
            <Button variant="primary" onClick={() => setAdding(true)}>
              <PlusIcon />
              {t("addKeywords")}
            </Button>
          </>
        }
      />
      <AddKeywordsDialog siteId={brand.id} open={adding} onOpenChange={setAdding} />

      {/* Real Google numbers first: what people searched and clicked. */}
      <GscPerformanceCard siteId={brand.id} connectHref={brandHref(brandSlug, "integrations/searchConsole")} />

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}
      {data && data.tracked === 0 && (
        <EmptyState
          icon={TrendingUpIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              {t("addKeywords")}
            </Button>
          }
        />
      )}

      {data && data.tracked > 0 && (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ["avg", data.avgPosition, data.avgDelta, "rank", "decimal"],
                ["top3", data.top3, data.top3Delta, "count", "integer"],
                ["top10", data.top10, data.top10Delta, "count", "integer"],
                ["top100", data.top100, data.top100Delta, "count", "integer"],
                ["notRanking", data.notRanking, data.notRankingDelta, "count", "integer"],
              ] as const
            ).map(([key, value, delta, unit, fmt]) => (
              <div key={key} className="flex flex-col gap-1.5 bg-surface p-4">
                <dt className="text-overline text-fg-3">{t(`stats.${key}`)}</dt>
                <dd className="flex flex-wrap items-baseline gap-2">
                  <span className="text-metric text-fg">{format.number(value, fmt)}</span>
                  {delta !== 0 && <DeltaChip value={delta} unit={unit} invert={key === "notRanking"} />}
                </dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Card>
              <div className="flex flex-col gap-0.5">
                <CardTitle>{t("avgTitle")}</CardTitle>
                <CardDescription>{t("avgDescription", { days })}</CardDescription>
              </div>
              <VisibilityTrend
                lowerIsBetter
                domain={["auto", "auto"]}
                ariaLabel={t("avgAria", {
                  from: data.avgSeries[0]?.value ?? 0,
                  to: data.avgSeries.at(-1)?.value ?? 0,
                })}
                series={[{ brandId: String(brand.id), name: brand.name, isYou: true, points: data.avgSeries }]}
              />
            </Card>
            <Card>
              <div className="flex flex-col gap-0.5">
                <CardTitle>{t("distTitle")}</CardTitle>
                <CardDescription>{t("distDescription")}</CardDescription>
              </div>
              <RankDistribution
                ariaLabel={t("distTitle")}
                bands={data.bands.map((b) => ({
                  label: t(`bands.${b.key}`),
                  count: b.count,
                  tone:
                    b.key === "top3"
                      ? "best"
                      : b.key === "top10" || b.key === "top20"
                        ? "good"
                        : b.key === "none"
                          ? "none"
                          : "mid",
                }))}
              />
            </Card>
          </div>

          <KeywordTable rows={rows} view={view} counts={counts} onView={(v) => void setView(v)} />
        </>
      )}
    </div>
  );
}

function KeywordTable({
  rows,
  view,
  counts,
  onView,
}: {
  rows: KeywordRanking[];
  view: View;
  counts: Record<string, number>;
  onView: (view: View) => void;
}) {
  const t = useTranslations("rankings.table");
  const format = useFormatter();
  const columns = React.useMemo<DataColumn<KeywordRanking>[]>(
    () => [
      {
        accessorKey: "keyword",
        header: t("keyword"),
        meta: { label: t("keyword"), pinned: true, className: "font-medium" },
      },
      {
        accessorKey: "position",
        header: t("position"),
        sortUndefined: "last",
        meta: { label: t("position"), numeric: true },
        cell: ({ row }) => <RankCell position={row.original.position} />,
      },
      {
        accessorKey: "volume",
        header: t("volume"),
        meta: { label: t("volume"), numeric: true },
        cell: ({ row }) => format.number(row.original.volume, "integer"),
      },
      {
        accessorKey: "difficulty",
        header: t("difficulty"),
        meta: { label: t("difficulty"), numeric: true },
        cell: ({ row }) => (
          <span
            className={cn(
              row.original.difficulty >= 60
                ? "text-danger"
                : row.original.difficulty >= 40
                  ? "text-warning"
                  : "text-success",
            )}
          >
            {row.original.difficulty}
          </span>
        ),
      },
      {
        accessorKey: "url",
        header: t("url"),
        meta: { label: t("url") },
        cell: ({ row }) =>
          row.original.url ? (
            <span dir="ltr" className="font-mono text-[12px] text-fg-2">
              {row.original.url}
            </span>
          ) : (
            <span className="text-fg-3">{t("noUrl")}</span>
          ),
      },
      {
        accessorKey: "aiEngines",
        header: t("ai"),
        meta: { label: t("ai") },
        cell: ({ row }) => {
          const n = row.original.aiEngines;
          return (
            <Badge variant={n >= 3 ? "success" : n > 0 ? "warning" : "neutral"}>
              {n > 0 ? t("aiEngines", { count: n }) : t("aiNone")}
            </Badge>
          );
        },
      },
    ],
    [t, format],
  );

  return (
    <Card className="gap-0 p-0">
      <DataTable
        caption={t("caption")}
        data={rows}
        columns={columns}
        minWidth={940}
        getRowId={(r) => r.id}
        csvFilename="google-rankings.csv"
        toolbar={
          <Tabs value={view} onValueChange={(v) => onView(v as View)}>
            <TabsList variant="segmented" aria-label={t("views")}>
              {views.map((v) => (
                <TabsTrigger key={v} value={v}>
                  {t(`viewTabs.${v}`, { count: counts[v] ?? 0 })}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
        empty={<EmptyState compact title={t("noneTitle")} description={t("noneDescription")} />}
      />
    </Card>
  );
}
