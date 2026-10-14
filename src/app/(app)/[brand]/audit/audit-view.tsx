"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileSearchIcon,
  Loader2Icon,
  MonitorIcon,
  RadarIcon,
  RotateCwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "lucide-react";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Approval } from "@/lib/mocks/types";
import type { CrawlPage } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import {
  fixStateOf,
  groupIssues,
  ISSUE_STATUSES,
  severityBadge,
  useAudit,
  useProposeFixes,
  useRunAudit,
  type AuditRow,
  type IssueGroup,
  type IssueStatusFilter,
} from "@/features/audit/hooks";
import { isCrawlActive, useCrawlRun, useFinishCrawl, useLatestRunId, useStartCrawl } from "@/features/audit/crawl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/account/stat-card";
import { ApprovalCard } from "@/components/agent/approval-card";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { OwnerChip } from "@/components/brand/owner-chip";
import { Pager } from "@/components/brand/pager";
import { ScoreRing } from "@/components/brand/score-ring";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";
import { WithPagePreview, pathOf } from "@/components/crawl/page-inspector";
import { PagesPanel } from "./pages-panel";

export { severityBadge };

const views = ["issues", "pages"] as const;
const severities = ["all", "critical", "warning", "notice"] as const;
const layouts = ["grouped", "list"] as const;
const statusFilters = ["all", ...ISSUE_STATUSES] as const;

type FixState = "open" | "fixing" | "proposed" | "fixed";

/** Opens a crawled page in the preview beside the issue list. */
const PreviewContext = React.createContext<(page: CrawlPage) => void>(() => {});

/** An affected page: opens the preview when the crawl page is known, else the live URL in a new tab. */
function PageLink({ row, className }: { row: AuditRow; className?: string }) {
  const preview = React.useContext(PreviewContext);
  if (!row.url) return null;
  const label = <span className="truncate">{pathOf(row.url)}</span>;
  return row.crawlPage ? (
    <button
      type="button"
      onClick={() => preview(row.crawlPage as CrawlPage)}
      className={cn("inline-flex min-w-0 items-center gap-1 text-start hover:text-blue hover:underline", className)}
    >
      {label}
      <MonitorIcon aria-hidden className="size-3.5 shrink-0" />
    </button>
  ) : (
    <a
      href={row.url}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex min-w-0 items-center gap-1 hover:text-blue", className)}
    >
      {label}
      <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0" />
    </a>
  );
}

/**
 * Site audit: the latest crawl (recrawl from here), Site Guard's issues
 * grouped by type with every affected page, and every crawled page with what
 * the crawler read on it.
 */
export function AuditView() {
  const t = useTranslations("audit");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { brand } = useShell();
  const siteId = brand?.id ?? 0;
  const [view, setView] = useQueryState("view", parseAsStringLiteral(views).withDefault("issues"));
  const [severity, setSeverity] = useQueryState("severity", parseAsStringLiteral(severities).withDefault("all"));
  const [layout, setLayout] = useQueryState("layout", parseAsStringLiteral(layouts).withDefault("grouped"));
  const [status, setStatus] = useQueryState("status", parseAsStringLiteral(statusFilters).withDefault("all"));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const query = useAudit(brand, { status, page });
  const audit = useRunAudit(siteId);
  const fix = useProposeFixes(siteId);
  const runId = useLatestRunId(siteId, query.data?.raw);
  const run = useCrawlRun(siteId, runId);
  const startCrawl = useStartCrawl(siteId);
  const finishCrawl = useFinishCrawl(siteId);
  const [approval, setApproval] = React.useState<{ approval: Approval; issueIds: string[] } | null>(null);
  const [preview, setPreview] = React.useState<CrawlPage | null>(null);

  // A crawl started here is audited as soon as it finishes.
  const watching = React.useRef<number | null>(null);
  React.useEffect(() => {
    const current = run.data;
    if (!current || watching.current !== current.id || isCrawlActive(current.status)) return;
    watching.current = null;
    if (current.status === "failed") {
      toast.error(current.error_message ?? t("crawl.failed"));
      return;
    }
    toast.success(t("crawl.done", { count: current.pages_crawled }));
    finishCrawl.mutate(undefined, {
      onSuccess: (result) => toast.success(t("auditDone", { count: result.issues_created })),
      onError: (error) => toast.error(getErrorMessage(error, t("auditFailed"))),
    });
  }, [run.data, finishCrawl, t]);

  const recrawl = () =>
    startCrawl.mutate(undefined, {
      onSuccess: (started) => {
        watching.current = started.id;
        toast(t("crawl.started"));
      },
      onError: (error) => toast.error(getErrorMessage(error, t("crawl.startFailed"))),
    });

  const runAudit = () =>
    audit.mutate(undefined, {
      onSuccess: (result) => toast.success(t("auditDone", { count: result.issues_created })),
      onError: (error) => toast.error(getErrorMessage(error, t("auditFailed"))),
    });

  if (!brand || query.isPending) return <PageSkeleton kpis={4} panels={2} />;
  const data = query.data;
  const rows = data?.rows ?? [];
  const crawling = isCrawlActive(run.data?.status) || startCrawl.isPending;

  const stateOf = (row: AuditRow): FixState => {
    if (fix.isPending && fix.variables?.includes(Number(row.id))) return "fixing";
    const raw = data?.raw.find((i) => String(i.id) === row.id);
    return raw ? fixStateOf(raw) : "open";
  };
  const fixable = (list: AuditRow[]) =>
    list.filter(
      (r) => r.owner === "rankoya" && r.status !== "resolved" && r.status !== "ignored" && stateOf(r) === "open",
    );
  const visible = rows.filter((r) => severity === "all" || r.severity === severity);
  const count = (s: (typeof severities)[number]) => rows.filter((r) => s === "all" || r.severity === s).length;
  const rankoyaOpen = fixable(rows);

  const askToFix = (list: AuditRow[]) =>
    setApproval({
      issueIds: list.map((i) => i.id),
      approval: {
        id: `apr_fix_${list.map((i) => i.id).join("_")}`,
        title: list.length === 1 ? list[0].title : t("fixAllTitle", { count: list.length }),
        status: "pending",
        items: list.map((i) => (i.url ? t("fixItemPage", { title: i.title, page: pathOf(i.url) }) : i.title)),
        channels: ["web", "telegram"],
      },
    });

  const pagesCrawled = run.data?.pages_crawled ?? data?.pagesChecked ?? 0;
  const checkedAt = run.data?.completed_at ?? data?.checkedAt;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={
          data && data.seoHealth !== null && checkedAt
            ? t("description", {
                domain: data.domain,
                pages: pagesCrawled,
                when: format.relativeTime(new Date(checkedAt), now),
              })
            : t("descriptionEmpty", { domain: brand.domain })
        }
        actions={
          <>
            <Button variant="secondary" onClick={recrawl} loading={crawling} disabled={crawling}>
              <RadarIcon />
              {crawling ? t("crawl.running") : t("crawl.recrawl")}
            </Button>
            <Button variant="secondary" onClick={runAudit} loading={audit.isPending || finishCrawl.isPending}>
              <RotateCwIcon />
              {t("run")}
            </Button>
            {rankoyaOpen.length > 0 && (
              <Button variant="agent" onClick={() => askToFix(rankoyaOpen)}>
                <WrenchIcon />
                {t("fixAll", { count: rankoyaOpen.length })}
              </Button>
            )}
          </>
        }
      />

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}

      {run.data && <CrawlRunCard run={run.data} />}

      {data && data.seoHealth === null && !crawling && (
        <EmptyState
          icon={ShieldCheckIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button size="sm" variant="secondary" onClick={runId ? runAudit : recrawl} loading={audit.isPending}>
              {runId ? t("run") : t("crawl.recrawl")}
            </Button>
          }
        />
      )}

      {data && data.seoHealth !== null && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Card className="flex-row flex-wrap items-center justify-around gap-6">
            <div className="flex flex-col items-center gap-2">
              <ScoreRing score={data.seoHealth} label={t("seoHealth")} />
              <span className="text-small font-medium text-fg">{t("seoHealth")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreRing score={data.aiReadiness} label={t("aiReadiness")} />
              <span className="text-small font-medium text-fg">{t("aiReadiness")}</span>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={FileSearchIcon} label={t("stats.pages")} value={format.number(pagesCrawled)} />
            <StatCard
              icon={ShieldAlertIcon}
              label={t("stats.open")}
              value={data.counts.open === null ? "—" : format.number(data.counts.open + (data.counts.in_progress ?? 0))}
            />
            <StatCard
              icon={CheckIcon}
              label={t("stats.resolved")}
              value={data.counts.resolved === null ? "—" : format.number(data.counts.resolved)}
            />
            <StatCard icon={WrenchIcon} label={t("stats.fixable")} value={format.number(rankoyaOpen.length)} />
          </div>
        </div>
      )}

      <Tabs value={view} onValueChange={(v) => void setView(v as (typeof views)[number])}>
        <TabsList aria-label={t("viewLabel")}>
          {views.map((v) => (
            <TabsTrigger key={v} value={v}>
              {t(`views.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === "pages" ? (
        <PagesPanel siteId={siteId} runId={runId} issues={rows} />
      ) : (
        data &&
        (data.seoHealth !== null || status !== "all") && (
          <PreviewContext.Provider value={setPreview}>
            <WithPagePreview page={preview} onClose={() => setPreview(null)}>
              <Card className="gap-0 p-0">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Tabs value={severity} onValueChange={(v) => void setSeverity(v as (typeof severities)[number])}>
                      <TabsList aria-label={t("severityLabel")}>
                        {severities.map((s) => (
                          <TabsTrigger key={s} value={s}>
                            {t(`tabs.${s}`, { count: count(s) })}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={status}
                        onValueChange={(v) => {
                          void setStatus(v as IssueStatusFilter);
                          void setPage(1);
                        }}
                      >
                        <SelectTrigger aria-label={t("statusLabel")} className="h-8 w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusFilters.map((s) => (
                            <SelectItem key={s} value={s}>
                              {data.counts[s] === null
                                ? t(`statusFilter.${s}`)
                                : t("statusFilterCount", { label: t(`statusFilter.${s}`), count: data.counts[s] ?? 0 })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Tabs value={layout} onValueChange={(v) => void setLayout(v as (typeof layouts)[number])}>
                        <TabsList variant="segmented" aria-label={t("layoutLabel")}>
                          {layouts.map((l) => (
                            <TabsTrigger key={l} value={l}>
                              {t(`layouts.${l}`)}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                  <p className="text-small text-fg-2">
                    {t("rankoyaCan", { count: rows.filter((i) => i.owner === "rankoya").length })}
                  </p>
                </div>

                {visible.length === 0 ? (
                  <div className="p-5">
                    <EmptyState icon={ShieldCheckIcon} title={t("noneTitle")} description={t("noneBody")} compact />
                  </div>
                ) : layout === "grouped" ? (
                  <ul className="flex flex-col divide-y divide-border">
                    {groupIssues(visible).map((group) => (
                      <GroupRow
                        key={group.type}
                        group={group}
                        stateOf={stateOf}
                        onFix={(list) => askToFix(list)}
                        fixable={fixable(group.rows)}
                      />
                    ))}
                  </ul>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {visible.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} state={stateOf(issue)} onFix={() => askToFix([issue])} />
                    ))}
                  </ul>
                )}

                <Pager
                  className="border-t border-border px-5 py-3"
                  page={page}
                  lastPage={data.lastPage}
                  onPage={(p) => void setPage(p)}
                  busy={query.isFetching}
                />
              </Card>
            </WithPagePreview>
          </PreviewContext.Provider>
        )
      )}

      <Dialog open={approval !== null} onOpenChange={(open) => !open && setApproval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("approveTitle")}</DialogTitle>
            <DialogDescription>{t("approveDescription")}</DialogDescription>
          </DialogHeader>
          {approval && (
            <ApprovalCard
              approval={approval.approval}
              onEdit={() => setApproval(null)}
              onDecided={(decided) => {
                if (decided.status === "approved") {
                  fix.mutate(approval.issueIds.map(Number), {
                    onSuccess: (proposals) => toast.success(t("proposed", { count: proposals.length })),
                    onError: (error) => toast.error(getErrorMessage(error, t("fixFailed"))),
                  });
                }
                setApproval(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** The latest crawl: status, progress and when it ran. */
function CrawlRunCard({ run }: { run: NonNullable<ReturnType<typeof useCrawlRun>["data"]> }) {
  const t = useTranslations("audit.crawl");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const active = isCrawlActive(run.status);
  const total = Math.max(run.pages_discovered, run.pages_crawled, 1);
  const variant = run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "blue";
  const when = run.completed_at ?? run.started_at ?? run.created_at;
  return (
    <Card className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>{t("title")}</CardTitle>
          <Badge variant={variant} shape="pill">
            {active && <Loader2Icon className="animate-spin" />}
            {t(`status.${run.status}`)}
          </Badge>
        </div>
        <span className="text-caption font-normal text-fg-3">
          {t(active ? "startedAt" : "finishedAt", { when: format.relativeTime(new Date(when), now) })}
        </span>
      </div>
      {active && <Progress value={(run.pages_crawled / total) * 100} aria-label={t("progressLabel")} />}
      <p className="num text-small text-fg-2">
        {t("summary", { crawled: run.pages_crawled, discovered: run.pages_discovered, failed: run.pages_failed })}
      </p>
      {run.error_message && <p className="text-small text-danger">{run.error_message}</p>}
    </Card>
  );
}

function FixControl({ state, onFix }: { state: FixState; onFix: () => void }) {
  const t = useTranslations("audit");
  if (state === "open") {
    return (
      <Button size="sm" variant="secondary" onClick={onFix}>
        <WrenchIcon />
        {t("letRankoyaFix")}
      </Button>
    );
  }
  return (
    <span className={cn("flex items-center gap-1.5 text-small", state === "fixing" ? "text-fg-2" : "text-success")}>
      {state === "fixing" ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
      {state === "fixed" ? t("fixed") : state === "proposed" ? t("fixReady") : t("fixing")}
    </span>
  );
}

/** One issue type, with every page it was found on. */
function GroupRow({
  group,
  stateOf,
  fixable,
  onFix,
}: {
  group: IssueGroup;
  stateOf: (row: AuditRow) => FixState;
  fixable: AuditRow[];
  onFix: (rows: AuditRow[]) => void;
}) {
  const t = useTranslations("audit");
  const { brandSlug } = useShell();
  const [open, setOpen] = React.useState(false);
  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4">
          <Badge variant={severityBadge[group.severity]} className="mt-0.5">
            {t(`severity.${group.severity}`)}
          </Badge>
          <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
            <CollapsibleTrigger className="group flex items-center gap-1.5 text-start text-small font-medium text-fg hover:text-blue">
              {group.title}
              <span className="rounded-full bg-surface-2 px-2 num text-caption text-fg-2">{group.rows.length}</span>
              <ChevronDownIcon aria-hidden className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <p className="text-small text-fg-2">{group.why}</p>
            <span className="num text-caption text-fg-3">
              {t("pages", { count: new Set(group.rows.map((r) => r.url ?? r.id)).size })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <OwnerChip owner={group.owner} />
            {group.owner === "rankoya" && fixable.length > 0 ? (
              <Button size="sm" variant="secondary" onClick={() => onFix(fixable)}>
                <WrenchIcon />
                {fixable.length === 1 ? t("letRankoyaFix") : t("fixGroup", { count: fixable.length })}
              </Button>
            ) : (
              group.owner !== "rankoya" && (
                <Button asChild size="sm" variant="ghost">
                  <Link href={brandHref(brandSlug, `audit/${group.rows[0].id}`)}>
                    <BookOpenIcon />
                    {t("howToFix")}
                  </Link>
                </Button>
              )
            )}
          </div>
        </div>
        <CollapsibleContent>
          <ul className="mx-5 mb-4 flex flex-col divide-y divide-border rounded-lg border border-border">
            {group.rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
                <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
                  {row.url ? (
                    <PageLink row={row} className="text-small text-fg" />
                  ) : (
                    <span className="text-small text-fg">{t("siteWide")}</span>
                  )}
                  {row.currentValue && (
                    <span className="truncate text-caption font-normal text-fg-3">
                      {t("currentValue", { value: row.currentValue })}
                    </span>
                  )}
                </div>
                <Badge variant={row.status === "resolved" ? "success" : "outline"}>
                  {t(`statusFilter.${row.status}`)}
                </Badge>
                {row.owner === "rankoya" && row.status !== "resolved" && (
                  <FixControl state={stateOf(row)} onFix={() => onFix([row])} />
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link href={brandHref(brandSlug, `audit/${row.id}`)}>{t("details")}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function IssueRow({ issue, state, onFix }: { issue: AuditRow; state: FixState; onFix: () => void }) {
  const t = useTranslations("audit");
  const { brandSlug } = useShell();
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4">
      <Badge variant={severityBadge[issue.severity]} className="mt-0.5">
        {t(`severity.${issue.severity}`)}
      </Badge>
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
        <Link
          href={brandHref(brandSlug, `audit/${issue.id}`)}
          className="text-small font-medium text-fg hover:text-blue hover:underline"
        >
          {issue.title}
        </Link>
        <p className="text-small text-fg-2">{issue.why}</p>
        {issue.url ? (
          <PageLink row={issue} className="text-caption text-blue" />
        ) : (
          <span className="text-caption text-fg-3">{t("siteWide")}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={issue.status === "resolved" ? "success" : "outline"}>{t(`statusFilter.${issue.status}`)}</Badge>
        <OwnerChip owner={issue.owner} />
        {issue.owner === "rankoya" ? (
          issue.status !== "resolved" && <FixControl state={state} onFix={onFix} />
        ) : (
          <Button asChild size="sm" variant="ghost">
            <Link href={brandHref(brandSlug, `audit/${issue.id}`)}>
              <BookOpenIcon />
              {t("howToFix")}
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}
