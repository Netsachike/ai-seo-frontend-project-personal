"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon, DownloadIcon, RadarIcon, ScanSearchIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { BrandSummary, Engine, Kpi } from "@/lib/api/types";
import { useJob } from "@/lib/api/use-job";
import { useFakeQuery } from "@/lib/fake-query";
import { nextActions, orbitActivity } from "@/lib/mocks/ui-data";
import { cn } from "@/lib/utils";
import { useBrandSummary, useJobRunner } from "@/features/insights/hooks";
import { useRange } from "@/features/insights/url-state";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DeltaChip } from "@/components/brand/delta-chip";
import { EmptyState } from "@/components/brand/empty-state";
import { EngineIcon } from "@/components/brand/engine-icon";
import { ErrorState } from "@/components/brand/error-state";
import { JobBanner } from "@/components/brand/job-banner";
import { KpiCard } from "@/components/brand/kpi-card";
import { OrbitAvatar } from "@/components/brand/logo";
import { OwnerChip } from "@/components/brand/owner-chip";
import { ScoreRing } from "@/components/brand/score-ring";
import { ShareOfVoice } from "@/components/charts/share-of-voice";
import { VisibilityTrend } from "@/components/charts/visibility-trend";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RangePicker } from "@/components/layout/range-picker";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";

function useGreetingPart(): "morning" | "afternoon" | "evening" {
  const format = useFormatter();
  const now = useNow({ updateInterval: 10 * 60_000 });
  const hour = Number(format.dateTime(now, { hour: "numeric", hourCycle: "h23", numberingSystem: "latn" }));
  return hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "evening";
}

export function OverviewView() {
  const t = useTranslations("overview");
  const { brand, workspace, me, brandSlug } = useShell();
  const { range } = useRange();
  const summary = useBrandSummary(workspace?.id, brand?.id, range);
  const scan = useJobRunner("job_scan");
  const part = useGreetingPart();
  const firstName = me?.name.split(" ")[0] ?? "";

  if (!brand || summary.isPending) return <PageSkeleton />;

  const data = summary.data;
  const firstScan = data?.status === "first_scan_running" || data?.status === "no_data";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("greeting", { part, name: firstName })}
        description={t("description", { brand: brand.name })}
        actions={
          <>
            <RangePicker />
            {!firstScan && (
              <Button variant="secondary" onClick={() => toast(t("exportStarted"))}>
                <DownloadIcon />
                {t("export")}
              </Button>
            )}
            <Button variant="primary" onClick={scan.start} disabled={scan.running || firstScan}>
              <ScanSearchIcon />
              {t("runScan")}
            </Button>
          </>
        }
      />

      {scan.job && <JobBanner job={scan.job} title={t("scanRunning")} onDismiss={scan.dismiss} />}

      {summary.isError && <ErrorState onRetry={() => summary.refetch()} />}
      {data && firstScan && <FirstScanState summary={data} />}
      {data && !firstScan && (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <HeroCard summary={data} />
            <div className="grid gap-4 sm:grid-cols-2">
              {data.kpis.map((kpi) => (
                <OverviewKpi key={kpi.key} kpi={kpi} questions={data.visibility.questionCount ?? 50} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>{t("trendTitle")}</CardTitle>
                  <CardDescription>{t("trendDescription")}</CardDescription>
                </div>
              </CardHeader>
              <VisibilityTrend series={data.trend} domain={[20, 80]} ariaLabel={trendSummary(data, t)} />
            </Card>
            <Card>
              <div className="flex flex-col gap-0.5">
                <CardTitle>{t("sovTitle")}</CardTitle>
                <CardDescription>{t("sovDescription")}</CardDescription>
              </div>
              <ShareOfVoice items={data.shareOfVoice} />
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <NextActions brandId={brand.id} slug={brandSlug} />
            <OrbitFeed brandId={brand.id} />
          </div>
        </>
      )}
    </div>
  );
}

function trendSummary(data: BrandSummary, t: ReturnType<typeof useTranslations<"overview">>) {
  const you = data.trend.find((s) => s.isYou);
  const first = you?.points[0]?.value ?? 0;
  const last = you?.points.at(-1)?.value ?? 0;
  return t("trendAria", { from: first, to: last });
}

function HeroCard({ summary }: { summary: BrandSummary }) {
  const t = useTranslations("overview");
  const tEngine = useTranslations("engines");
  const format = useFormatter();
  const { brandSlug } = useShell();
  const { visibility } = summary;
  const leader = summary.trend
    .filter((s) => !s.isYou)
    .map((s) => ({ name: s.name, value: s.points.at(-1)?.value ?? 0 }))
    .sort((a, b) => b.value - a.value)[0];

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle>{t("heroTitle")}</CardTitle>
        <CardAction>
          <Button asChild variant="link" size="sm">
            <Link href={brandHref(brandSlug, "visibility")}>
              {t("details")}
              <ArrowRightIcon className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-5">
        <ScoreRing score={visibility.score} label={t("heroTitle")} />
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
          <DeltaChip value={visibility.delta.value} unit={visibility.delta.unit} className="self-start" />
          <p className="text-body text-fg-2">
            {visibility.rank && leader
              ? t("heroRank", {
                  rank: visibility.rank,
                  count: visibility.brandCount,
                  leader: leader.name,
                  score: Math.round(leader.value),
                })
              : t("heroLeading")}
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {summary.engines.map(({ engine, mentionRate }) => (
          <li key={engine} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3">
            <span className="flex min-w-0 items-center gap-2 text-small text-fg">
              <EngineIcon engine={engine as Engine} />
              <span className="truncate">{tEngine(engine as Engine)}</span>
            </span>
            {mentionRate === null ? (
              <span className="col-span-2 text-caption font-normal text-fg-3">{t("engineUnreachable")}</span>
            ) : (
              <>
                <Progress value={mentionRate * 100} tone="blue" aria-label={tEngine(engine as Engine)} />
                <span className="text-end num text-small text-fg">{format.number(mentionRate, "percent")}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-caption font-normal text-fg-3">{t("engineNote", { count: visibility.questionCount ?? 50 })}</p>
    </Card>
  );
}

function OverviewKpi({ kpi, questions }: { kpi: Kpi; questions: number }) {
  const t = useTranslations("kpi");
  const format = useFormatter();
  const { brandSlug } = useShell();
  const answers = questions * 5;
  switch (kpi.key) {
    case "mentionRate":
      return (
        <KpiCard
          label={t("mentionRate.label")}
          value={kpi.value}
          format={(v) => format.number(v, "percent")}
          delta={kpi.delta}
          spark={kpi.spark}
          note={t("mentionRate.note", { mentioned: Math.round(kpi.value * answers), answers })}
          href={brandHref(brandSlug, "visibility")}
        />
      );
    case "avgAiPosition":
      return (
        <KpiCard
          label={t("avgAiPosition.label")}
          value={kpi.value}
          format={(v) => t("avgAiPosition.value", { value: format.number(v, "decimal") })}
          delta={kpi.delta}
          spark={kpi.spark}
          note={t("avgAiPosition.note")}
          href={brandHref(brandSlug, "visibility")}
        />
      );
    case "googleTop10":
      return (
        <KpiCard
          label={t("googleTop10.label")}
          value={kpi.value}
          format={(v) => format.number(v, "integer")}
          suffix={kpi.total ? t("ofTotal", { total: kpi.total }) : undefined}
          delta={kpi.delta}
          spark={kpi.spark}
          note={t("googleTop10.note")}
          href={brandHref(brandSlug, "rankings")}
        />
      );
    case "aiCitations":
      return (
        <KpiCard
          label={t("aiCitations.label")}
          value={kpi.value}
          format={(v) => format.number(v, "integer")}
          delta={kpi.delta}
          spark={kpi.spark}
          note={t("aiCitations.note")}
          href={brandHref(brandSlug, "visibility")}
        />
      );
  }
}

function NextActions({ brandId, slug }: { brandId: string; slug: string }) {
  const t = useTranslations("overview.actions");
  const actions = useFakeQuery(["nextActions", brandId], () => nextActions(brandId, slug));
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <CardAction>
          <Button asChild variant="link" size="sm">
            <Link href={brandHref(slug, "actions")}>
              {t("openPlan")}
              <ArrowRightIcon className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      {actions.isPending && <ListSkeleton rows={4} />}
      {actions.isError && <ErrorState compact onRetry={() => actions.refetch()} />}
      <ol className="-mx-2 flex flex-col">
        {actions.data?.map((a, i) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-3 hover:bg-surface-2">
            <span className="w-5 num text-caption text-fg-3">{i + 1}</span>
            <OwnerChip owner={a.owner} />
            <div className="flex min-w-0 flex-1 basis-56 flex-col">
              <span className="text-small font-medium text-fg">{a.title}</span>
              <span className="text-caption font-normal text-fg-3">
                {t("meta", { impact: t(`impact.${a.impact}`), note: a.note })}
              </span>
            </div>
            <Button asChild size="sm" variant={i === 0 ? "primary" : "secondary"} className="ms-8 sm:ms-0">
              <Link href={a.href}>{t(`cta.${a.cta}`)}</Link>
            </Button>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function OrbitFeed({ brandId }: { brandId: string }) {
  const t = useTranslations("overview.feed");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const feed = useFakeQuery(["activity", brandId], () => orbitActivity(brandId));
  return (
    <Card>
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>
      {feed.isPending && <ListSkeleton rows={4} />}
      {feed.isError && <ErrorState compact onRetry={() => feed.refetch()} />}
      <ol className="flex flex-col">
        {feed.data?.map((item, i) => (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < (feed.data?.length ?? 0) - 1 && (
              <span aria-hidden className="absolute start-3 top-7 bottom-0 w-px bg-border" />
            )}
            <OrbitAvatar size={24} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-small text-fg">{item.text}</span>
              <span className="text-caption font-normal text-fg-3">
                <time dateTime={item.at}>{format.relativeTime(new Date(item.at), now)}</time>
                {" · "}
                {item.sub}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-6 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-10/12" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Zero-data: never a broken "0.0" chart. Points at the running (or next) scan instead. */
function FirstScanState({ summary }: { summary: BrandSummary }) {
  const t = useTranslations("overview.firstScan");
  const tShared = useTranslations("shared");
  const tEngine = useTranslations("engines");
  const format = useFormatter();
  const job = useJob(summary.firstScanJobId);
  const minutes = Math.max(1, Math.ceil((job.data?.etaSeconds ?? 180) / 60));

  return (
    <div className="flex flex-col gap-4">
      <EmptyState
        icon={RadarIcon}
        tone="agent"
        title={t("title")}
        description={tShared("noData", { minutes })}
        action={
          job.data && (
            <div className="flex w-full max-w-md flex-col gap-2">
              <Progress value={job.data.progress * 100} tone="ink" aria-label={t("title")} />
              <span className="num text-caption text-fg-2">
                {t("progress", { percent: format.number(job.data.progress, "percent") })}
              </span>
            </div>
          )
        }
      />
      {job.data && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {job.data.steps.map((s) => (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border bg-surface p-3 text-small",
                s.status === "failed" && "border-danger-bg",
              )}
            >
              <EngineIcon engine={s.key as Engine} />
              <span className="min-w-0 flex-1 truncate">{tEngine(s.key as Engine)}</span>
              <span className={cn("num text-caption", s.status === "failed" ? "text-danger" : "text-fg-2")}>
                {s.status === "failed" ? t("retrying") : format.number(s.progress, "percent")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
