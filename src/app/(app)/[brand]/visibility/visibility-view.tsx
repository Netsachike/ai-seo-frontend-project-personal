"use client";

import * as React from "react";
import { ListPlusIcon, RadarIcon, ScanSearchIcon, SparklesIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { type CitedSource, type EngineVisibility } from "@/lib/mocks/ui-data";
import { useRunAiScan } from "@/features/insights/hooks";
import { useEngineFilter } from "@/features/insights/url-state";
import { useGeneratePrompts, useVisibility } from "@/features/visibility/hooks";
import { TESTED_ENGINES } from "@/features/visibility/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/brand/empty-state";
import { EngineChip } from "@/components/brand/engine-chip";
import { EngineName } from "@/components/brand/engine-icon";
import { ErrorState } from "@/components/brand/error-state";
import { KpiCard } from "@/components/brand/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";
import { QuestionTests } from "./question-tests";

export function VisibilityView() {
  const t = useTranslations("visibility");
  const tKpi = useTranslations("kpi");
  const tEngine = useTranslations("engines");
  const format = useFormatter();
  const { brand } = useShell();
  const { engine, setEngine } = useEngineFilter();
  const query = useVisibility(brand);
  const generate = useGeneratePrompts(brand?.id ?? 0);
  const scan = useRunAiScan(brand?.id ?? 0);

  const generateQuestions = () =>
    generate.mutate(undefined, {
      onSuccess: (result) => toast.success(t("generated", { count: result.prompts_created })),
      onError: (error) => toast.error(getErrorMessage(error, t("generateFailed"))),
    });

  if (!brand || query.isPending) return <PageSkeleton />;
  const data = query.data;
  // One engine can have several models (Perplexity Sonar and Sonar Deep Research): combine them.
  const engineRows = engine === "all" ? [] : (data?.engines.filter((e) => e.engine === engine) ?? []);
  const selected = engineRows.length ? combine(engineRows) : undefined;
  const position = selected ? selected.avgPosition : (data?.avgPosition ?? null);
  const testAll = () => scan.mutate();
  const questionTests = data && (
    <QuestionTests
      questions={data.questions}
      lastTested={data.lastTested ?? {}}
      scan={scan}
      highlight={selected?.engine}
      generating={generate.isPending}
      onGenerate={generateQuestions}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description", { count: data?.questions.length ?? 0 })}
        actions={
          <>
            <Button variant="secondary" loading={generate.isPending} onClick={generateQuestions}>
              <SparklesIcon />
              {t("generateQuestions")}
            </Button>
            <Button
              variant="primary"
              loading={scan.isPending && !scan.variables}
              disabled={scan.isPending}
              onClick={testAll}
            >
              <ScanSearchIcon />
              {t("test.all")}
            </Button>
          </>
        }
      />

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}

      {data && data.score === null && (
        <EmptyState
          icon={RadarIcon}
          tone="agent"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="secondary" size="sm" loading={scan.isPending} onClick={testAll}>
              {t("test.all")}
            </Button>
          }
        />
      )}
      {data && data.score === null && questionTests}

      {data && data.score !== null && (
        <>
          <div role="group" aria-label={t("engineFilter")} className="flex flex-wrap gap-2">
            {(["all", ...TESTED_ENGINES] as const).map((e) => (
              <EngineChip key={e} engine={e} pressed={engine === e} onPressedChange={() => void setEngine(e)} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t("kpis.score")}
              value={selected?.score ?? data.score}
              format={(v) => format.number(v, "integer")}
              note={
                selected
                  ? t("kpis.engineNote", { engine: tEngine(selected.engine) })
                  : t("kpis.scoreNoteTests", { count: data.answers })
              }
            />
            <KpiCard
              label={tKpi("mentionRate.label")}
              value={selected?.mentionRate ?? data.mentionRate}
              format={(v) => format.number(v, "percent")}
              note={
                selected
                  ? t("kpis.engineNote", { engine: tEngine(selected.engine) })
                  : tKpi("mentionRate.note", { mentioned: data.mentioned, answers: data.answers })
              }
            />
            <KpiCard
              label={t("kpis.position")}
              value={position ?? 0}
              format={(v) =>
                position === null ? "—" : tKpi("avgAiPosition.value", { value: format.number(v, "decimal") })
              }
              note={position === null ? t("kpis.positionNone") : tKpi("avgAiPosition.note")}
            />
            <KpiCard
              label={t("kpis.tests")}
              value={data.totalTests ?? data.answers}
              format={(v) => format.number(v, "integer")}
              note={t("kpis.testsNoteModels", { prompts: data.questions.length, models: data.engines.length })}
            />
          </div>

          <EngineTable rows={engineRows.length ? engineRows : data.engines} checkedAt={data.checkedAt} />
          {questionTests}
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
        id: "model",
        accessorFn: (r) => r.model ?? r.engine,
        header: t("model"),
        meta: { label: t("model"), pinned: true },
        cell: ({ row }) => (
          <span className="flex flex-col">
            <EngineName engine={row.original.engine} className="font-medium" />
            {row.original.model && (
              <span dir="ltr" className="text-start font-mono text-[12px] text-fg-3">
                {row.original.model}
              </span>
            )}
          </span>
        ),
      },
      {
        id: "answers",
        accessorFn: (r) => r.answers ?? 0,
        header: t("answers"),
        meta: { label: t("answers"), numeric: true },
      },
      {
        id: "score",
        accessorFn: (r) => r.score ?? 0,
        header: t("score"),
        meta: { label: t("score"), numeric: true },
        cell: ({ getValue }) => format.number(getValue() as number, "integer"),
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
        sortUndefined: "last",
        meta: { label: t("position"), numeric: true },
        cell: ({ row }) =>
          row.original.avgPosition === null
            ? "—"
            : tKpi("avgAiPosition.value", { value: format.number(row.original.avgPosition, "decimal") }),
      },
      { accessorKey: "citations", header: t("citations"), meta: { label: t("citations"), numeric: true } },
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
        getRowId={(r) => r.model ?? r.engine}
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

/** Several models of one engine as one: answer-weighted score and mention rate. */
function combine(rows: EngineVisibility[]): EngineVisibility {
  const answers = rows.reduce((sum, r) => sum + (r.answers ?? 0), 0);
  const weighted = (pick: (r: EngineVisibility) => number) =>
    answers ? rows.reduce((sum, r) => sum + pick(r) * (r.answers ?? 0), 0) / answers : 0;
  const positions = rows.map((r) => r.avgPosition).filter((p): p is number => p !== null);
  return {
    ...rows[0],
    model: undefined,
    answers,
    score: weighted((r) => r.score ?? 0),
    mentionRate: weighted((r) => r.mentionRate),
    avgPosition: positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null,
    citations: rows.reduce((sum, r) => sum + r.citations, 0),
  };
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
