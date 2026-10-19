"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, ChevronDownIcon, MessageSquareTextIcon, PlayIcon, SparklesIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

import type { Engine } from "@/types/types";
import type { TrackedQuestion } from "@/lib/mocks/ui-data";
import { cn } from "@/lib/utils";
import type { AiScanInput } from "@/features/insights/hooks";
import { AI_TEST_MODELS, TESTED_ENGINES, modelLabel } from "@/features/visibility/model";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/brand/empty-state";
import { EngineIcon } from "@/components/brand/engine-icon";
import { RankCell } from "@/components/brand/rank-cell";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";

const ALL = "all";

type Scan = {
  mutate: (input: AiScanInput) => void;
  isPending: boolean;
  current: string | null;
  variables: AiScanInput | void | undefined;
};

/**
 * The site's questions, shown before any test runs. Pick questions (or none
 * for all of them) and a model (or all models), then test; each row also
 * tests that one question with one model or all of them.
 */
export function QuestionTests({
  questions,
  lastTested,
  scan,
  highlight,
  generating,
  onGenerate,
}: {
  questions: TrackedQuestion[];
  lastTested: Record<string, string>;
  scan: Scan;
  highlight?: Engine;
  generating: boolean;
  onGenerate: () => void;
}) {
  const t = useTranslations("visibility.questions");
  const tTest = useTranslations("visibility.test");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { brandSlug } = useShell();
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [model, setModel] = React.useState<string>(ALL);

  // Drop selections of questions that are no longer active.
  const ids = React.useMemo(() => new Set(questions.map((q) => q.id)), [questions]);
  const chosen = [...selected].filter((id) => ids.has(id));
  const allChosen = questions.length > 0 && chosen.length === questions.length;
  const busy = scan.isPending;
  const runningIds = busy && scan.variables ? (scan.variables.promptIds ?? []).map(String) : [];

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const run = (promptIds: string[], only: string) => {
    const input: AiScanInput = {
      models: only === ALL ? undefined : [only],
      promptIds: promptIds.length ? promptIds.map(Number) : undefined,
    };
    scan.mutate(input);
    return input;
  };
  // The toolbar button spins only for the run it started, not for a row's.
  const [bulk, setBulk] = React.useState<AiScanInput | null>(null);

  const columns: DataColumn<TrackedQuestion>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          aria-label={t("selectAll")}
          checked={allChosen ? true : chosen.length > 0 ? "indeterminate" : false}
          onCheckedChange={(v) => setSelected(v === true ? new Set(ids) : new Set())}
        />
      ),
      enableSorting: false,
      meta: { label: t("select"), csv: () => null },
      cell: ({ row }) => (
        <Checkbox
          aria-label={t("selectOne", { question: row.original.text })}
          checked={selected.has(row.original.id)}
          onCheckedChange={(v) => toggle(row.original.id, v === true)}
        />
      ),
    },
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
      id: "tested",
      accessorFn: (r) => r.testedModels?.length ?? 0,
      header: t("tested"),
      meta: { label: t("tested"), numeric: true },
      cell: ({ row }) => {
        const tested = row.original.testedModels ?? [];
        return (
          <span
            className="num text-small text-fg-2"
            title={tested.length ? tested.map(modelLabel).join(", ") : undefined}
          >
            {t("testedCount", { count: tested.length, total: AI_TEST_MODELS.length })}
          </span>
        );
      },
    },
    {
      accessorKey: "rank",
      header: t("rank"),
      sortUndefined: "last",
      meta: { label: t("rank"), numeric: true },
      cell: ({ row }) => <RankCell position={row.original.rank} />,
    },
    { accessorKey: "topCompetitor", header: t("competitor"), meta: { label: t("competitor") } },
    {
      id: "lastTested",
      accessorFn: (r) => r.lastTested ?? "",
      header: t("lastTested"),
      meta: { label: t("lastTested"), numeric: true },
      cell: ({ row }) =>
        row.original.lastTested ? format.relativeTime(new Date(row.original.lastTested), now) : t("never"),
    },
    {
      id: "test",
      header: () => <span className="sr-only">{t("test")}</span>,
      enableSorting: false,
      meta: { label: t("test"), csv: () => null },
      cell: ({ row }) => {
        const running = runningIds.includes(row.original.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                loading={running}
                disabled={busy && !running}
                aria-label={t("testOne", { question: row.original.text })}
              >
                <PlayIcon />
                {t("test")}
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => run([row.original.id], ALL)}>{tTest("allModels")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{tTest("oneModel")}</DropdownMenuLabel>
              {AI_TEST_MODELS.map((m) => (
                <DropdownMenuItem key={m.id} onSelect={() => run([row.original.id], m.id)}>
                  <EngineIcon engine={m.engine} />
                  {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const scope = chosen.length
    ? t("scopeSelected", { count: chosen.length })
    : t("scopeAll", { count: questions.length });

  return (
    <Card data-tour="question-tests" className="gap-0 p-0">
      {questions.length === 0 ? (
        <EmptyState
          icon={MessageSquareTextIcon}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Button variant="primary" size="sm" loading={generating} onClick={onGenerate}>
              <SparklesIcon />
              {t("generate")}
            </Button>
          }
        />
      ) : (
        <DataTable
          caption={t("title")}
          data={questions}
          columns={columns}
          minWidth={980}
          getRowId={(r) => r.id}
          csvFilename="tracked-questions.csv"
          toolbar={
            <div className="flex w-full flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col">
                <h2 className="text-h3">{t("title")}</h2>
                <span className={cn("text-caption font-normal", busy ? "text-blue" : "text-fg-3")}>
                  {busy && scan.current ? tTest("running", { model: modelLabel(scan.current) }) : t("legend")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={model} onValueChange={setModel} disabled={busy}>
                  <SelectTrigger aria-label={tTest("modelLabel")} className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{tTest("allModels")}</SelectItem>
                    {AI_TEST_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <EngineIcon engine={m.engine} />
                        {m.label}
                        <span className="text-caption font-normal text-fg-3">
                          {lastTested[m.id]
                            ? tTest("last", { when: format.relativeTime(new Date(lastTested[m.id]), now) })
                            : tTest("never")}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="primary"
                  size="sm"
                  loading={busy && scan.variables === bulk}
                  disabled={busy}
                  onClick={() => setBulk(run(chosen, model))}
                >
                  <PlayIcon />
                  {tTest("run", { scope, model: model === ALL ? tTest("allModels") : modelLabel(model) })}
                </Button>
              </div>
            </div>
          }
        />
      )}
    </Card>
  );
}

export function EngineDots({ mentionedBy, highlight }: { mentionedBy: Engine[]; highlight?: Engine }) {
  const t = useTranslations("visibility.questions");
  const tEngine = useTranslations("engines");
  return (
    <span className="inline-flex items-center gap-2" dir="ltr">
      {TESTED_ENGINES.map((e) => {
        const on = mentionedBy.includes(e);
        return (
          <span
            key={e}
            title={`${tEngine(e)}: ${on ? t("mentioned") : t("notMentioned")}`}
            className={cn("relative", highlight && highlight !== e && "opacity-30")}
          >
            <EngineIcon engine={e} size={20} className={cn(!on && "opacity-35 grayscale")} />
            {on && (
              <CheckIcon
                aria-hidden
                className="absolute -end-1 -bottom-1 size-3 rounded-full bg-success stroke-[3] p-px text-white ring-2 ring-surface"
              />
            )}
          </span>
        );
      })}
      <span className="sr-only">{t("dotsLabel", { count: mentionedBy.length })}</span>
    </span>
  );
}
