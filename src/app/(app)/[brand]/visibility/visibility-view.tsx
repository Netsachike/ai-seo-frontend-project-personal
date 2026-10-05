"use client";

import * as React from "react";
import Link from "next/link";
import { ListPlusIcon, PlusIcon, RadarIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Engine } from "@/lib/api/types";
import { useFakeQuery } from "@/lib/fake-query";
import {
  displayEngines,
  visibilityData,
  type CitedSource,
  type EngineVisibility,
  type TrackedQuestion,
} from "@/lib/mocks/ui-data";
import { cn } from "@/lib/utils";
import { useEngineFilter } from "@/features/insights/url-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { DeltaChip } from "@/components/brand/delta-chip";
import { EmptyState } from "@/components/brand/empty-state";
import { EngineChip } from "@/components/brand/engine-chip";
import { EngineName } from "@/components/brand/engine-icon";
import { ErrorState } from "@/components/brand/error-state";
import { KpiCard } from "@/components/brand/kpi-card";
import { RankCell } from "@/components/brand/rank-cell";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RangePicker } from "@/components/layout/range-picker";
import { useShell } from "@/components/layout/shell-context";
import { AddQuestionsDialog } from "./add-questions-dialog";

export function VisibilityView() {
  const t = useTranslations("visibility");
  const tKpi = useTranslations("kpi");
  const tEngine = useTranslations("engines");
  const format = useFormatter();
  const { brand } = useShell();
  const { engine, setEngine } = useEngineFilter();
  const [adding, setAdding] = React.useState(false);
  const query = useFakeQuery(["visibility", brand?.id], () => visibilityData(brand?.id ?? ""), {
    enabled: Boolean(brand),
  });

  if (!brand || query.isPending) return <PageSkeleton />;
  const data = query.data;
  const selected = engine === "all" ? undefined : data?.engines.find((e) => e.engine === engine);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description", { count: data?.questions.length ?? 0 })}
        actions={
          <>
            <RangePicker />
            <Button variant="primary" onClick={() => setAdding(true)}>
              <PlusIcon />
              {t("addQuestions")}
            </Button>
          </>
        }
      />
      <AddQuestionsDialog open={adding} onOpenChange={setAdding} />

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}
      {data && data.score === null && (
        <EmptyState
          icon={RadarIcon}
          tone="agent"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              {t("addQuestions")}
            </Button>
          }
        />
      )}

      {data && data.score !== null && (
        <>
          <div role="group" aria-label={t("engineFilter")} className="flex flex-wrap gap-2">
            {(["all", ...displayEngines] as const).map((e) => (
              <EngineChip key={e} engine={e} pressed={engine === e} onPressedChange={() => void setEngine(e)} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t("kpis.score")}
              value={data.score}
              format={(v) => format.number(v, "integer")}
              delta={{ value: data.scoreDelta, unit: "points" }}
              note={t("kpis.scoreNote", { rank: data.rank ?? 0, count: data.brandCount })}
            />
            <KpiCard
              label={tKpi("mentionRate.label")}
              value={selected?.mentionRate ?? data.mentionRate}
              format={(v) => format.number(v, "percent")}
              delta={{ value: selected?.change ?? data.mentionDelta, unit: "points" }}
              note={
                selected
                  ? t("kpis.engineNote", { engine: tEngine(selected.engine) })
                  : tKpi("mentionRate.note", { mentioned: data.mentioned, answers: data.answers })
              }
            />
            <KpiCard
              label={t("kpis.position")}
              value={selected?.avgPosition ?? data.avgPosition}
              format={(v) => tKpi("avgAiPosition.value", { value: format.number(v, "decimal") })}
              delta={{ value: data.positionDelta, unit: "rank" }}
              note={tKpi("avgAiPosition.note")}
            />
            <KpiCard
              label={t("kpis.sentiment")}
              value={data.positiveSentiment}
              format={(v) => format.number(v, "percent")}
              delta={{ value: data.sentimentDelta, unit: "points" }}
              note={t("kpis.sentimentNote")}
            />
          </div>

          <EngineTable rows={selected ? [selected] : data.engines} checkedAt={data.checkedAt} />
          <QuestionsTable rows={data.questions} highlight={selected?.engine} />
          <SourcesCard sources={data.sources} />
        </>
      )}
    </div>
  );
}

function EngineTable({ rows, checkedAt }: { rows: EngineVisibility[]; checkedAt: string }) {
  const t = useTranslations("visibility.byEngine");
  const tKpi = useTranslations("kpi");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const columns = React.useMemo<DataColumn<EngineVisibility>[]>(
    () => [
      {
        accessorKey: "engine",
        header: t("engine"),
        meta: { label: t("engine"), pinned: true },
        cell: ({ row }) => <EngineName engine={row.original.engine} className="font-medium" />,
      },
      {
        accessorKey: "mentionRate",
        header: t("mentionRate"),
        meta: { label: t("mentionRate"), numeric: true },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-surface-2 sm:block">
              <span
                className="block h-full rounded-full bg-chart-you"
                style={{ width: `${row.original.mentionRate * 100}%` }}
              />
            </span>
            {format.number(row.original.mentionRate, "percent")}
          </span>
        ),
      },
      {
        accessorKey: "avgPosition",
        header: t("position"),
        meta: { label: t("position"), numeric: true },
        cell: ({ row }) => tKpi("avgAiPosition.value", { value: format.number(row.original.avgPosition, "decimal") }),
      },
      { accessorKey: "citations", header: t("citations"), meta: { label: t("citations"), numeric: true } },
      {
        accessorKey: "sentiment",
        header: t("sentiment"),
        meta: { label: t("sentiment") },
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.sentiment === "positive"
                ? "success"
                : row.original.sentiment === "negative"
                  ? "danger"
                  : "neutral"
            }
          >
            {t(`sentiments.${row.original.sentiment}`)}
          </Badge>
        ),
      },
      {
        accessorKey: "change",
        header: t("change"),
        meta: { label: t("change"), numeric: true },
        cell: ({ row }) => <DeltaChip value={row.original.change} unit="points" />,
      },
    ],
    [t, tKpi, format],
  );
  return (
    <Card className="gap-0 p-0">
      <DataTable
        caption={t("title")}
        data={rows}
        columns={columns}
        minWidth={680}
        getRowId={(r) => r.engine}
        csvFilename="visibility-by-engine.csv"
        toolbar={
          <div className="flex flex-col">
            <h2 className="text-h3">{t("title")}</h2>
            <span className="text-caption font-normal text-fg-3">
              {t("checked", { when: format.relativeTime(new Date(checkedAt), now) })}
            </span>
          </div>
        }
      />
    </Card>
  );
}

function EngineDots({ mentionedBy, highlight }: { mentionedBy: Engine[]; highlight?: Engine }) {
  const t = useTranslations("visibility.questions");
  const tEngine = useTranslations("engines");
  return (
    <span className="inline-flex items-center gap-1.5" dir="ltr">
      {displayEngines.map((e) => {
        const on = mentionedBy.includes(e);
        return (
          <span
            key={e}
            title={`${tEngine(e)}: ${on ? t("mentioned") : t("notMentioned")}`}
            className={cn(
              "size-2.5 rounded-full border",
              on ? "border-chart-you bg-chart-you" : "border-border-strong bg-transparent",
              highlight && highlight !== e && "opacity-30",
            )}
          />
        );
      })}
      <span className="sr-only">{t("dotsLabel", { count: mentionedBy.length })}</span>
    </span>
  );
}

function QuestionsTable({ rows, highlight }: { rows: TrackedQuestion[]; highlight?: Engine }) {
  const t = useTranslations("visibility.questions");
  const { brandSlug } = useShell();
  const columns = React.useMemo<DataColumn<TrackedQuestion>[]>(
    () => [
      {
        accessorKey: "text",
        header: t("question"),
        meta: { label: t("question"), pinned: true },
        cell: ({ row }) => (
          <Link
            href={brandHref(brandSlug, `visibility/prompts/${row.original.id}`)}
            className="font-medium text-fg hover:text-blue hover:underline"
          >
            {row.original.text}
          </Link>
        ),
      },
      {
        id: "engines",
        accessorFn: (r) => r.mentionedBy.length,
        header: t("engines"),
        meta: { label: t("engines"), csv: (r) => (r as TrackedQuestion).mentionedBy.length },
        cell: ({ row }) => <EngineDots mentionedBy={row.original.mentionedBy} highlight={highlight} />,
      },
      {
        accessorKey: "rank",
        header: t("rank"),
        sortUndefined: "last",
        meta: { label: t("rank"), numeric: true },
        cell: ({ row }) => <RankCell position={row.original.rank} />,
      },
      { accessorKey: "topCompetitor", header: t("competitor"), meta: { label: t("competitor") } },
    ],
    [t, brandSlug, highlight],
  );
  return (
    <Card className="gap-0 p-0">
      <DataTable
        caption={t("title")}
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        csvFilename="tracked-questions.csv"
        toolbar={
          <div className="flex flex-col">
            <h2 className="text-h3">{t("title")}</h2>
            <span className="text-caption font-normal text-fg-3">{t("legend")}</span>
          </div>
        }
      />
    </Card>
  );
}

function SourcesCard({ sources }: { sources: CitedSource[] }) {
  const t = useTranslations("visibility.sources");
  const missing = sources.filter((s) => s.status === "missing").length;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <CardAction>
          <Button
            variant="secondary"
            size="sm"
            disabled={missing === 0}
            onClick={() => toast.success(t("tasksAdded", { count: missing }))}
          >
            <ListPlusIcon />
            {t("toTasks")}
          </Button>
        </CardAction>
      </CardHeader>
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.domain} className="flex items-center gap-3 border-b border-border py-3">
            <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-[13px] text-fg">
              {s.domain}
            </span>
            <span className="num text-small text-fg-2">{t("citations", { count: s.citations })}</span>
            <Badge variant={s.status === "missing" ? "danger" : s.status === "yourSite" ? "blue" : "success"}>
              {t(`status.${s.status}`)}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
