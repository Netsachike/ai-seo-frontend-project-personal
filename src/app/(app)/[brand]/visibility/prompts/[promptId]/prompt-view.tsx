"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ChevronRightIcon, ListPlusIcon, RotateCwIcon, SparkleIcon } from "lucide-react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Engine } from "@/types/types";
import type { EngineAnswer } from "@/lib/mocks/ui-data";
import { useUiStore } from "@/lib/store/ui";
import { cn } from "@/lib/utils";
import { useRunAiScan } from "@/features/insights/hooks";
import { useQuestion } from "@/features/visibility/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EngineIcon } from "@/components/brand/engine-icon";
import { ErrorState } from "@/components/brand/error-state";
import { OwnerChip } from "@/components/brand/owner-chip";
import { brandHref } from "@/components/layout/nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

export function PromptView({ promptId }: { promptId: string }) {
  const t = useTranslations("prompt");
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  const { brand, brandSlug } = useShell();
  const recheck = useRunAiScan(brand?.id ?? 0, [Number(promptId)]);
  const [planned, setPlanned] = React.useState(false);
  const query = useQuestion(brand, Number(promptId));

  if (!brand || query.isPending) return <PageSkeleton kpis={5} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const data = query.data;
  if (!data) notFound();

  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  const q = data.question;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <nav aria-label={t("breadcrumb")} className="flex items-center gap-1.5 text-small text-fg-2">
          <Link href={brandHref(brandSlug, "visibility")} className="hover:text-fg hover:underline">
            {t("crumbVisibility")}
          </Link>
          <ChevronRightIcon aria-hidden className="size-3.5 text-fg-3 rtl:-scale-x-100" />
          <span aria-current="page">{t("crumbQuestions")}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-[72ch] min-w-0 flex-col gap-3">
            <h1 className="text-h1 text-fg">
              <q>{q.text}</q>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(`intent.${q.intent}`)}</Badge>
              <Badge variant="neutral">
                {t("marketLanguage", {
                  market: regions.of(data.market) ?? data.market,
                  language: languages.of(data.language) ?? data.language,
                })}
              </Badge>
              <span className="text-caption font-normal text-fg-3">
                {t("checked", { when: format.relativeTime(new Date(data.checkedAt), now) })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => recheck.mutate()} loading={recheck.isPending}>
              <RotateCwIcon />
              {t("recheck")}
            </Button>
            <Button
              variant="agent"
              onClick={() => useUiStore.getState().askRankoya(t("closeGapPrompt", { question: q.text }))}
            >
              <SparkleIcon />
              {t("closeGap")}
            </Button>
          </div>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {data.answers.map((a) => (
          <li key={a.engine} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card">
            <span className="flex items-center gap-2 text-small font-medium text-fg">
              <EngineIcon engine={a.engine} />
              <EngineLabel engine={a.engine} />
            </span>
            <AnswerState answer={a} />
          </li>
        ))}
      </ul>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="flex flex-col gap-4">
          {data.answers.map((a) => (
            <AnswerCard key={a.engine} answer={a} brandName={brand.name} />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {/* No improvement plan or weekly history in the API yet: these show once it sends them. */}
          {data.plan.length > 0 && (
            <Card>
              <div className="flex flex-col gap-0.5">
                <CardTitle>{t("planTitle")}</CardTitle>
                <CardDescription>{t("planDescription")}</CardDescription>
              </div>
              <ol className="flex flex-col gap-3">
                {data.plan.map((step, i) => (
                  <li key={step.id} className="flex gap-3">
                    <span className="mt-0.5 w-4 num text-caption text-fg-3">{i + 1}</span>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <OwnerChip owner={step.owner} className="self-start" />
                      <p className="text-small text-fg">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Button
                variant={planned ? "secondary" : "primary"}
                disabled={planned}
                onClick={() => {
                  setPlanned(true);
                  toast.success(t("planned", { count: data.plan.length }));
                }}
              >
                {planned ? <CheckIcon /> : <ListPlusIcon />}
                {planned ? t("inPlan") : t("addToPlan")}
              </Button>
            </Card>
          )}
          {data.history.length > 0 && <HistoryCard history={data.history} />}
        </div>
      </div>
    </div>
  );
}

function EngineLabel({ engine }: { engine: Engine }) {
  const t = useTranslations("engines");
  return <span className="truncate">{t(engine)}</span>;
}

function AnswerState({ answer }: { answer: EngineAnswer }) {
  const t = useTranslations("prompt");
  if (answer.status === "unreachable") return <span className="text-small text-fg-3">{t("unreachable")}</span>;
  if (answer.position === null) return <span className="text-small font-medium text-danger">{t("notMentioned")}</span>;
  return <span className="text-metric num text-success">{t("position", { position: answer.position })}</span>;
}

/** Highlights every mention of the brand so it's easy to find in a long answer. */
function Highlighted({ text, brand }: { text: string; brand: string }) {
  const parts = text.split(brand);
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <mark className="rounded-sm bg-signal px-1 font-semibold text-signal-ink">{brand}</mark>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

function AnswerCard({ answer, brandName }: { answer: EngineAnswer; brandName: string }) {
  const t = useTranslations("prompt");
  const tShared = useTranslations("shared");
  const tEngine = useTranslations("engines");
  const format = useFormatter();
  const name = tEngine(answer.engine);
  const retryAt = new Date(Date.now() + 30 * 60 * 1000);

  if (answer.status === "unreachable") {
    return (
      <Card className="gap-3">
        <div className="flex items-center gap-2.5">
          <EngineIcon engine={answer.engine} />
          <CardTitle as="h3">{name}</CardTitle>
        </div>
        <p className="text-small text-fg-2">
          {tShared("engineDown", { engine: name, time: format.dateTime(retryAt, "time") })}
        </p>
      </Card>
    );
  }

  const mentioned = answer.position !== null;
  return (
    <Card className="gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <EngineIcon engine={answer.engine} />
        <CardTitle as="h3">{name}</CardTitle>
        <Badge variant={mentioned ? "success" : "danger"}>
          {mentioned ? t("mentionedAt", { position: answer.position ?? 0, listed: answer.listed }) : t("notMentioned")}
        </Badge>
      </div>
      <blockquote lang="en" dir="auto" className="border-s-2 border-border ps-4 text-body-lg text-fg">
        <Highlighted text={answer.answer} brand={brandName} />
      </blockquote>
      <div className="flex flex-wrap items-center gap-2 text-caption font-normal text-fg-3">
        {t("cited")}
        {answer.citations.map((c) => (
          <span
            key={c}
            dir="ltr"
            className={cn(
              "rounded-sm px-1.5 py-0.5 font-mono text-[12px]",
              c.includes("northwind") ? "bg-blue-bg text-blue-ink" : "bg-surface-2 text-fg-2",
            )}
          >
            {c}
          </span>
        ))}
      </div>
      {answer.whyMissing && (
        <p className="rounded-md bg-warning-bg px-3 py-2.5 text-small text-fg">
          <strong className="font-semibold text-warning">{t("whyMissing")}</strong> {answer.whyMissing}
        </p>
      )}
    </Card>
  );
}

function HistoryCard({ history }: { history: number[] }) {
  const t = useTranslations("prompt");
  const first = history[0] ?? 0;
  const last = history.at(-1) ?? 0;
  return (
    <Card>
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("historyTitle")}</CardTitle>
        <CardDescription>{t("historyDescription")}</CardDescription>
      </div>
      <div
        role="img"
        aria-label={t("historyAria", { first, last, weeks: history.length })}
        className="flex h-28 items-end gap-1.5"
        dir="ltr"
      >
        {history.map((n, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="num text-[11px] text-fg-3">{n}</span>
            <span
              className={cn("w-full rounded-t-sm", i === history.length - 1 ? "bg-chart-you" : "bg-chart-other/40")}
              style={{ height: `${Math.max(4, (n / 5) * 80)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-caption font-normal text-fg-3" dir="ltr">
        <span>{t("weeksAgo", { weeks: history.length - 1 })}</span>
        <span>{t("thisWeek")}</span>
      </div>
    </Card>
  );
}
