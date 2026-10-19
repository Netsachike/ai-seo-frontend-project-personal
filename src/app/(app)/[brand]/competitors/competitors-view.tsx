"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CheckIcon,
  ExternalLinkIcon,
  FilePenLineIcon,
  Link2Icon,
  ListPlusIcon,
  ScanSearchIcon,
  UsersIcon,
} from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { keywordKeys, serpKeys } from "@/lib/api/query-keys";
import copilotService from "@/services/copilot";
import keywordService from "@/services/keywords";
import serpService from "@/services/serp";
import { useDiscoverProspects } from "@/features/authority/hooks";
import type { CompetitorRow, KeywordGap, LinkSite, QuestionGap } from "@/lib/mocks/ui-data";
import { useCompetitors, useResearchCompetitors } from "@/features/competitors/hooks";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { OwnerChip } from "@/components/brand/owner-chip";
import { colorize } from "@/components/charts/series-colors";
import { Markdown } from "@/components/agent/markdown";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

export function CompetitorsView() {
  const t = useTranslations("competitors");
  const { brand } = useShell();
  const query = useCompetitors(brand);
  const research = useResearchCompetitors(brand?.id ?? 0);

  const runResearch = () =>
    research.mutate(undefined, {
      onSuccess: (result) => toast.success(t("researched", { count: result.competitors })),
      onError: (error) => toast.error(getErrorMessage(error, t("researchFailed"))),
    });

  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={4} />;
  const data = query.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={
          data && data.rows.length > 0 ? t("insight", { leader: data.leader, lead: data.lead }) : t("descriptionEmpty")
        }
        actions={
          <Button variant="primary" loading={research.isPending} onClick={runResearch}>
            <ScanSearchIcon />
            {t("research")}
          </Button>
        }
      />

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}
      {data && data.rows.length === 0 && (
        <EmptyState icon={UsersIcon} title={t("emptyTitle")} description={t("emptyDescription")} />
      )}
      {data && data.rows.length > 0 && (
        <>
          <PageGuide />
          <ComparisonTable rows={data.rows} />
          <div className="grid gap-4 xl:grid-cols-2">
            <QuestionGaps gaps={data.questionGaps} />
            <KeywordGaps gaps={data.keywordGaps} />
          </div>
          <LinkSites sites={data.sites} />
        </>
      )}
      <ResearchRuns siteId={brand.id} />
    </div>
  );
}

/** What each part of the page is for, so the numbers and buttons make sense at a glance. */
function PageGuide() {
  const t = useTranslations("competitors.guide");
  const items = ["compare", "gaps", "links"] as const;
  return (
    <section
      aria-label={t("label")}
      data-tour="competitors-guide"
      className="grid gap-3 rounded-xl border border-border bg-surface-2/60 p-4 md:grid-cols-3"
    >
      {items.map((key, i) => (
        <div key={key} className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface num text-caption font-semibold text-fg">
            {i + 1}
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-small font-semibold text-fg">{t(`${key}.title`)}</h2>
            <p className="text-small text-fg-2">{t(`${key}.body`)}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function ComparisonTable({ rows }: { rows: CompetitorRow[] }) {
  const t = useTranslations("competitors.table");
  const tKpi = useTranslations("kpi");
  const format = useFormatter();
  const colored = colorize(rows);
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-col gap-0.5 border-b border-border px-5 py-4">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[860px]">
          <caption className="sr-only">{t("caption")}</caption>
          <TableHeader>
            <TableRow>
              <TableHead>{t("brand")}</TableHead>
              {(["score", "share", "position", "citations", "top10"] as const).map((key) => (
                <TableHead key={key} className="text-end">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                      {t(key)}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64">{t(`help.${key}`)}</TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
              <TableHead className="text-end">
                <span className="sr-only">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colored.map((r) => (
              <TableRow key={r.id} className={cn(r.isYou && "bg-blue-bg/50 hover:bg-blue-bg/60")}>
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                    <span className="flex min-w-0 flex-col">
                      <span className={cn("text-small text-fg", r.isYou ? "font-semibold" : "font-medium")}>
                        {r.isYou ? t("you", { name: r.name }) : r.name}
                      </span>
                      <span dir="ltr" className="text-start font-mono text-[12px] text-fg-3">
                        {r.domain}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-end num">{format.number(r.score, "integer")}</TableCell>
                <TableCell className="text-end num">{format.number(r.share, "percent")}</TableCell>
                <TableCell className="text-end num">
                  {tKpi("avgAiPosition.value", { value: format.number(r.avgPosition, "decimal") })}
                </TableCell>
                <TableCell className="text-end num">{r.citations}</TableCell>
                <TableCell className="text-end num">{r.top10}</TableCell>
                <TableCell className="text-end">
                  {!r.isYou && (
                    <span className="inline-flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <a href={`https://${r.domain}`} target="_blank" rel="noreferrer">
                          <ExternalLinkIcon />
                          {t("visit")}
                        </a>
                      </Button>
                      <ProspectButton domain={r.domain} />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function QuestionGaps({ gaps }: { gaps: QuestionGap[] }) {
  const t = useTranslations("competitors.questionGaps");
  const format = useFormatter();
  const { brand } = useShell();
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [open, setOpen] = React.useState<QuestionGap | null>(null);
  const ask = useMutation({
    mutationFn: async (gap: QuestionGap) => {
      const response = await copilotService.ask(brand?.id ?? 0, {
        question: t("prompt", { question: gap.question, competitors: gap.winners.map((w) => w.name).join(", ") }),
      });
      return { id: gap.id, answer: response.answer };
    },
    onSuccess: ({ id, answer }) => setDrafts((d) => ({ ...d, [id]: answer })),
    onError: (error) => toast.error(getErrorMessage(error, t("draftFailed"))),
  });
  const draft = (gap: QuestionGap) => {
    setOpen(gap);
    if (!drafts[gap.id]) ask.mutate(gap);
  };
  return (
    <Card>
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {gaps.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
              <q className="text-small font-medium text-fg">{g.question}</q>
              <span className="text-caption font-normal text-fg-3">
                {format.list(
                  g.winners.map((w) => t("winner", { name: w.name, engines: w.engines })),
                  { type: "conjunction" },
                )}
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              loading={ask.isPending && ask.variables?.id === g.id}
              onClick={() => draft(g)}
            >
              {drafts[g.id] ? <CheckIcon /> : <FilePenLineIcon />}
              {drafts[g.id] ? t("draftReady") : t("write")}
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{open?.question}</DialogTitle>
            <DialogDescription>{t("draftDescription")}</DialogDescription>
          </DialogHeader>
          {open && drafts[open.id] ? (
            <Markdown>{drafts[open.id]}</Markdown>
          ) : (
            <p className="text-small text-fg-2">{t("drafting")}</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function KeywordGaps({ gaps }: { gaps: KeywordGap[] }) {
  const t = useTranslations("competitors.keywordGaps");
  const format = useFormatter();
  const { brand } = useShell();
  const queryClient = useQueryClient();
  const [added, setAdded] = React.useState<string[]>([]);
  const add = useMutation({
    mutationFn: (gap: KeywordGap) => keywordService.discover(brand?.id ?? 0, { seed_keywords: [gap.keyword] }),
    onSuccess: (_result, gap) => {
      setAdded((a) => [...a, gap.id]);
      toast.success(t("added", { keyword: gap.keyword }));
      return queryClient.invalidateQueries({ queryKey: keywordKeys.all(brand?.id ?? 0) });
    },
    onError: (error) => toast.error(getErrorMessage(error, t("addFailed"))),
  });
  return (
    <Card>
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {gaps.map((g) => {
          const on = added.includes(g.id);
          return (
            <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                <span className="text-small font-medium text-fg">{g.keyword}</span>
                <span className="text-caption font-normal text-fg-3">
                  {t("who", { name: g.competitor, position: g.position })}
                </span>
              </div>
              <span className="num text-small text-fg-2">
                {t("volume", { volume: format.number(g.volume, "integer") })}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={on}
                loading={add.isPending && add.variables?.id === g.id}
                onClick={() => add.mutate(g)}
              >
                {on ? <CheckIcon /> : <ListPlusIcon />}
                {on ? t("inPlan") : t("addToPlan")}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function LinkSites({ sites }: { sites: LinkSite[] }) {
  const t = useTranslations("competitors.sites");
  const { brandSlug } = useShell();
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t("title")}</CardTitle>
            <OwnerChip owner="you" />
          </div>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <CardAction>
          <Button asChild variant="secondary" size="sm">
            <Link href={brandHref(brandSlug, "authority")}>
              {t("openAll")}
              <ArrowRightIcon className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      {sites.length === 0 && <p className="text-small text-fg-3">{t("empty")}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {sites.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-[13px] font-medium text-fg">
                {s.domain}
              </span>
              <Badge variant="neutral">{t(`kinds.${s.kind}`)}</Badge>
            </div>
            <p className="text-small text-fg-2">{s.why}</p>
            <span className="num text-caption text-fg-3">{t("authority", { score: s.authority })}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Turns this competitor's backlinks into outreach prospects on the Authority page. */
function ProspectButton({ domain }: { domain: string }) {
  const t = useTranslations("competitors.table");
  const { brand, brandSlug } = useShell();
  const discover = useDiscoverProspects(brand?.id ?? 0);
  if (discover.isSuccess) {
    return (
      <Button asChild size="sm" variant="ghost">
        <Link href={brandHref(brandSlug, "authority")}>
          <CheckIcon />
          {t("prospectsAdded")}
        </Link>
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          loading={discover.isPending}
          onClick={() =>
            discover.mutate(
              { competitor_domain: domain, limit: 20 },
              {
                onSuccess: (result) => toast.success(t("prospectsFound", { count: result.processed, domain })),
                onError: (error) => toast.error(getErrorMessage(error, t("prospectsFailed"))),
              },
            )
          }
        >
          <Link2Icon />
          {t("findProspects")}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{t("findProspectsHelp", { domain })}</TooltipContent>
    </Tooltip>
  );
}

/** Every SERP research run: when it ran and what it found. */
function ResearchRuns({ siteId }: { siteId: number }) {
  const t = useTranslations("competitors.runs");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const runs = useQuery({
    queryKey: serpKeys.runs(siteId),
    queryFn: async () => (await serpService.runs(siteId)).data,
  });
  if (!runs.data || runs.data.length === 0) return null;
  return (
    <Card className="gap-3">
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {runs.data.map((run) => (
          <li key={run.id} className="flex flex-wrap items-center gap-3 py-2.5 text-small">
            <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "blue"}>
              {run.status}
            </Badge>
            <span className="min-w-0 flex-1 num text-fg">
              {t("summary", {
                processed: run.keywords_processed,
                requested: run.keywords_requested,
                results: run.results_found,
              })}
            </span>
            <span className="text-caption font-normal text-fg-3">
              {run.started_at ? format.relativeTime(new Date(run.started_at), now) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
