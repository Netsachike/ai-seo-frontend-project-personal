"use client";

import * as React from "react";
import {
  ArchiveIcon,
  ChevronDownIcon,
  CloudDownloadIcon,
  ExternalLinkIcon,
  InboxIcon,
  Link2Icon,
  RefreshCwIcon,
  SendIcon,
  TrophyIcon,
  Undo2Icon,
  UsersIcon,
} from "lucide-react";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { BacklinkItem, BacklinkOpportunity, BacklinkStatus } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { toNumber } from "@/services/api/helpers";
import {
  BACKLINKS_PER_PAGE,
  useAnalyzeAuthority,
  useAuthorityProfile,
  useBacklinkOpportunity,
  useBacklinks,
  useBacklinkSummary,
  useDiscoverProspects,
  useMoveOpportunity,
  useOpportunityBoard,
} from "@/features/authority/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { DetailList } from "@/components/brand/detail-list";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { Pager } from "@/components/brand/pager";
import { ScoreRing } from "@/components/brand/score-ring";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";
import { PreviewPageButton } from "@/components/crawl/page-inspector";

const views = ["board", "backlinks"] as const;
const statusBadge: Record<BacklinkStatus, "neutral" | "blue" | "warning" | "success" | "danger" | "outline"> = {
  open: "neutral",
  researching: "blue",
  prospect: "outline",
  outreach: "warning",
  acquired: "success",
  rejected: "danger",
};
const priorityBadge = { high: "warning", medium: "blue", low: "neutral" } as const;

/**
 * The board's columns. The API keeps six statuses; the first three all mean
 * "not contacted yet", so they share a column. Moving a card back to it
 * saves `prospect`; restoring an archived one saves `open`.
 */
const COLUMNS = [
  { key: "toContact", statuses: ["open", "researching", "prospect"], icon: InboxIcon },
  { key: "contacted", statuses: ["outreach"], icon: SendIcon },
  { key: "won", statuses: ["acquired"], icon: TrophyIcon },
] as const satisfies ReadonlyArray<{ key: string; statuses: readonly BacklinkStatus[]; icon: unknown }>;
type ColumnKey = (typeof COLUMNS)[number]["key"];
const columnOf = (status: BacklinkStatus): ColumnKey | "archived" =>
  COLUMNS.find((c) => (c.statuses as readonly BacklinkStatus[]).includes(status))?.key ?? "archived";

const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * Authority: how much other websites trust the site (one summary card), and
 * an outreach board to win more links: sites to contact, sites contacted,
 * links won. The paid link numbers and the full list of linking sites load
 * only when asked for.
 */
export function AuthorityView() {
  const t = useTranslations("authority");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { brand } = useShell();
  const siteId = brand?.id ?? 0;
  const [view, setView] = useQueryState("view", parseAsStringLiteral(views).withDefault("board"));
  const profile = useAuthorityProfile(siteId);
  const analyze = useAnalyzeAuthority(siteId);
  const summary = useBacklinkSummary(siteId);
  const [confirmSummary, setConfirmSummary] = React.useState(false);
  const [prospectsOpen, setProspectsOpen] = React.useState(false);

  const runAnalyze = () =>
    analyze.mutate(undefined, {
      onSuccess: (result) => toast.success(t("analyzed", { count: result.summary.opportunities })),
      onError: (error) => toast.error(getErrorMessage(error, t("analyzeFailed"))),
    });

  const fetchSummary = async () => {
    setConfirmSummary(false);
    const result = await summary.refetch();
    if (result.isError) toast.error(getErrorMessage(result.error, t("live.failed")));
    else void profile.refetch();
  };

  if (!brand || profile.isPending) return <PageSkeleton kpis={4} panels={2} />;
  const p = profile.data;
  const live = summary.data?.summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={
          p?.last_analyzed_at
            ? t("description", { domain: brand.domain, when: format.relativeTime(new Date(p.last_analyzed_at), now) })
            : t("descriptionEmpty", { domain: brand.domain })
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setProspectsOpen(true)}>
              <UsersIcon />
              {t("prospects.open")}
            </Button>
            <Button variant="primary" onClick={runAnalyze} loading={analyze.isPending}>
              <RefreshCwIcon />
              {p ? t("reanalyze") : t("analyze")}
            </Button>
          </>
        }
      />

      {profile.isError && <ErrorState onRetry={() => profile.refetch()} />}

      <Card className="gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <CardTitle>{t("summary.title")}</CardTitle>
            <CardDescription>{t("summary.body")}</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setConfirmSummary(true)} loading={summary.isFetching}>
            <CloudDownloadIcon />
            {live ? t("live.refresh") : t("live.fetch")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <ScoreRing score={toNumber(p?.authority_readiness_score) ?? 0} label={t("scores.readiness")} size="sm" />
            <div className="flex max-w-56 flex-col gap-0.5">
              <span className="text-small font-semibold text-fg">{t("scores.readiness")}</span>
              <span className="text-caption font-normal text-fg-3">{t("scores.readinessHelp")}</span>
            </div>
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
            {(
              [
                ["domains", live?.referring_domains ?? p?.referring_domains ?? 0],
                ["backlinks", live?.backlinks ?? p?.external_backlink_count ?? 0],
                ["gap", Math.round(toNumber(p?.competitor_authority_gap_score) ?? 0)],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="text-caption font-normal text-fg-3">{t(`stats.${key}`)}</dt>
                <dd className="num text-h2 text-fg">{format.number(value)}</dd>
                <dd className="text-caption font-normal text-fg-3">{t(`stats.${key}Help`)}</dd>
              </div>
            ))}
          </dl>
        </div>
        {live && (
          <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-1 text-small font-medium text-blue hover:underline">
              {t("summary.more")}
              <ChevronDownIcon aria-hidden className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(
                  [
                    ["pages", live.referring_pages],
                    ["new", live.new_backlinks],
                    ["lost", live.lost_backlinks],
                    ["spam", live.backlinks_spam_score],
                    ["rank", live.rank],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <dt className="text-caption font-normal text-fg-3">{t(`live.metrics.${key}`)}</dt>
                    <dd className="num text-h3 text-fg">{format.number(value ?? 0)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-caption font-normal text-fg-3">
                {t("summary.updated", { when: format.relativeTime(new Date(live.retrieved_at), now) })}
                {live.sandbox && (
                  <Badge variant="warning" className="ms-2">
                    {t("sandbox")}
                  </Badge>
                )}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}
      </Card>

      <Tabs value={view} onValueChange={(v) => void setView(v as (typeof views)[number])}>
        <TabsList aria-label={t("viewLabel")}>
          {views.map((v) => (
            <TabsTrigger key={v} value={v}>
              {t(`views.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === "board" ? (
        <OutreachBoard siteId={siteId} onFindProspects={() => setProspectsOpen(true)} />
      ) : (
        <BacklinksPanel siteId={siteId} />
      )}

      <Dialog open={confirmSummary} onOpenChange={setConfirmSummary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("live.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("live.confirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmSummary(false)}>
              {t("cancel")}
            </Button>
            <Button variant="primary" onClick={() => void fetchSummary()}>
              {t("live.fetch")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProspectsDialog siteId={siteId} open={prospectsOpen} onOpenChange={setProspectsOpen} />
    </div>
  );
}

/**
 * Winning links, step by step: sites to contact, sites contacted, links won.
 * Each card moves forward with one button; "Not a fit" archives it.
 */
function OutreachBoard({ siteId, onFindProspects }: { siteId: number; onFindProspects: () => void }) {
  const t = useTranslations("authority.board");
  const tStatus = useTranslations("authority.status");
  const [openId, setOpenId] = useQueryState("open", parseAsInteger);
  const [showArchived, setShowArchived] = React.useState(false);
  const board = useOpportunityBoard(siteId);
  const move = useMoveOpportunity(siteId);

  const setStatus = (id: number, status: BacklinkStatus) =>
    move.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(t("moved", { status: tStatus(status) })),
        onError: (error) => toast.error(getErrorMessage(error, t("moveFailed"))),
      },
    );

  if (board.isPending) return <Skeleton className="h-80 rounded-xl" />;
  if (board.isError) return <ErrorState onRetry={() => board.refetch()} />;

  const rows = board.data.rows;
  const archived = rows.filter((r) => columnOf(r.status) === "archived");
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Link2Icon}
        title={t("emptyTitle")}
        description={t("emptyBody")}
        action={
          <Button size="sm" variant="primary" onClick={onFindProspects}>
            <UsersIcon />
            {t("findProspects")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-fg-2">{t("intro")}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const cards = rows.filter((r) => columnOf(r.status) === column.key);
          const Icon = column.icon;
          return (
            <section
              key={column.key}
              aria-labelledby={`col-${column.key}`}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-2/60 p-3"
            >
              <header className="flex flex-col gap-0.5 px-1">
                <h3 id={`col-${column.key}`} className="flex items-center gap-2 text-small font-semibold text-fg">
                  <Icon aria-hidden className="size-4 text-fg-3" />
                  {t(`columns.${column.key}.title`)}
                  <span className="rounded-full bg-surface px-2 num text-caption font-medium text-fg-2">
                    {cards.length}
                  </span>
                </h3>
                <p className="text-caption font-normal text-fg-3">{t(`columns.${column.key}.body`)}</p>
              </header>
              {cards.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-caption font-normal text-fg-3">
                  {t(`columns.${column.key}.empty`)}
                </p>
              ) : (
                <ul className="flex max-h-[640px] flex-col gap-2 overflow-y-auto">
                  {cards.map((o) => (
                    <li key={o.id}>
                      <OpportunityCard
                        o={o}
                        column={column.key}
                        onOpen={() => void setOpenId(o.id)}
                        onStatus={(status) => setStatus(o.id, status)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {board.data.total > rows.length && (
        <p className="text-caption font-normal text-fg-3">
          {t("capped", { shown: rows.length, total: board.data.total })}
        </p>
      )}

      {archived.length > 0 && (
        <Collapsible open={showArchived} onOpenChange={setShowArchived}>
          <CollapsibleTrigger className="group flex items-center gap-1 text-small font-medium text-fg-2 hover:text-fg">
            <ArchiveIcon aria-hidden className="size-4" />
            {t("archived", { count: archived.length })}
            <ChevronDownIcon aria-hidden className="size-4 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
              {archived.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => void setOpenId(o.id)}
                    className="min-w-0 flex-1 truncate text-start text-small text-fg hover:text-blue hover:underline"
                  >
                    {o.title}
                  </button>
                  <span className="text-caption font-normal text-fg-3">{hostOf(o.source_url)}</span>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, "open")}>
                    <Undo2Icon />
                    {t("restore")}
                  </Button>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      <OpportunitySheet siteId={siteId} id={openId} onClose={() => void setOpenId(null)} onStatus={setStatus} />
    </div>
  );
}

function OpportunityCard({
  o,
  column,
  onOpen,
  onStatus,
}: {
  o: BacklinkOpportunity;
  column: ColumnKey;
  onOpen: () => void;
  onStatus: (status: BacklinkStatus) => void;
}) {
  const t = useTranslations("authority.board");
  const tPriority = useTranslations("authority.priority");
  const host = hostOf(o.source_url);
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-card">
      <button
        type="button"
        onClick={onOpen}
        className="text-start text-small font-medium text-fg hover:text-blue hover:underline"
      >
        {o.title}
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={priorityBadge[o.priority]}>{tPriority(o.priority)}</Badge>
        {host && o.source_url && (
          <a
            href={o.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1 text-caption text-blue hover:underline"
          >
            <span className="truncate">{host}</span>
            <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {column === "toContact" && (
          <Button size="sm" variant="secondary" onClick={() => onStatus("outreach")}>
            <SendIcon />
            {t("markContacted")}
          </Button>
        )}
        {column === "contacted" && (
          <>
            <Button size="sm" variant="primary" onClick={() => onStatus("acquired")}>
              <TrophyIcon />
              {t("markWon")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus("prospect")}>
              <Undo2Icon />
              {t("backToContact")}
            </Button>
          </>
        )}
        {column === "won" && (
          <Button size="sm" variant="ghost" onClick={() => onStatus("outreach")}>
            <Undo2Icon />
            {t("notWonYet")}
          </Button>
        )}
        {column !== "won" && (
          <Button size="sm" variant="ghost" className="text-fg-3" onClick={() => onStatus("rejected")}>
            {t("notAFit")}
          </Button>
        )}
      </div>
    </article>
  );
}

function OpportunitySheet({
  siteId,
  id,
  onClose,
  onStatus,
}: {
  siteId: number;
  id: number | null;
  onClose: () => void;
  onStatus: (id: number, status: BacklinkStatus) => void;
}) {
  const t = useTranslations("authority.detail");
  const tStatus = useTranslations("authority.status");
  const query = useBacklinkOpportunity(siteId, id);
  const o = query.data;
  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="end" className="gap-0 overflow-y-auto data-[side=end]:max-w-[520px]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{o?.title ?? t("title")}</SheetTitle>
          <SheetDescription>{o?.type.replaceAll("_", " ")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-5">
          {query.isPending ? (
            <Skeleton className="h-48" />
          ) : query.isError ? (
            <ErrorState compact onRetry={() => query.refetch()} />
          ) : (
            o && (
              <>
                {o.description && <p className="text-small text-fg-2">{o.description}</p>}
                {o.crawl_page && (
                  <div>
                    <PreviewPageButton page={o.crawl_page} label={t("preview")} />
                  </div>
                )}
                {o.recommended_action && (
                  <div className="rounded-lg bg-blue-bg p-3 text-small text-blue-ink">
                    <span className="font-semibold">{t("todo")}</span> {o.recommended_action}
                  </div>
                )}
                <DetailList
                  items={[
                    { label: t("status"), value: <Badge variant={statusBadge[o.status]}>{tStatus(o.status)}</Badge> },
                    { label: t("score"), value: Math.round(toNumber(o.opportunity_score) ?? 0) },
                    { label: t("source"), value: o.source_url, mono: true },
                    { label: t("target"), value: o.target_url, mono: true },
                    { label: t("anchor"), value: o.anchor_suggestion },
                    { label: t("competitor"), value: o.competitor?.domain },
                    { label: t("keyword"), value: o.keyword?.keyword },
                    { label: t("moneyPage"), value: o.money_page?.name },
                  ]}
                />
                <div className="flex flex-wrap gap-2">
                  {(["outreach", "acquired", "rejected"] as const)
                    .filter((s) => s !== o.status)
                    .map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === "acquired" ? "primary" : "secondary"}
                        onClick={() => onStatus(o.id, s)}
                      >
                        {t(`mark.${s}`)}
                      </Button>
                    ))}
                </div>
              </>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Live backlinks. Each page is a paid provider call, so nothing loads until asked. */
function BacklinksPanel({ siteId }: { siteId: number }) {
  const t = useTranslations("authority.backlinks");
  const format = useFormatter();
  const [enabled, setEnabled] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const query = useBacklinks(siteId, offset, enabled);
  const total = query.data?.total_count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / BACKLINKS_PER_PAGE));

  const columns = React.useMemo<DataColumn<BacklinkItem>[]>(
    () => [
      {
        id: "source",
        accessorFn: (r) => r.source_domain ?? "",
        header: t("columns.source"),
        meta: { label: t("columns.source"), pinned: true, csv: (r) => (r as BacklinkItem).source_url ?? "" },
        cell: ({ row }) => (
          <div className="flex max-w-[22rem] flex-col gap-0.5">
            {row.original.source_url ? (
              <a
                href={row.original.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-small font-medium text-fg hover:text-blue"
              >
                <span className="truncate">{row.original.source_domain ?? hostOf(row.original.source_url)}</span>
                <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
              </a>
            ) : (
              <span className="text-small text-fg">{row.original.source_domain ?? "—"}</span>
            )}
            {row.original.source_title && (
              <span className="truncate text-caption font-normal text-fg-3">{row.original.source_title}</span>
            )}
          </div>
        ),
      },
      {
        id: "anchor",
        accessorFn: (r) => r.anchor ?? "",
        header: t("columns.anchor"),
        meta: { label: t("columns.anchor") },
        cell: ({ row }) => <span className="block max-w-[12rem] truncate">{row.original.anchor ?? "—"}</span>,
      },
      {
        id: "follow",
        accessorFn: (r) => (r.dofollow ? "dofollow" : "nofollow"),
        header: t("columns.follow"),
        meta: { label: t("columns.follow") },
        cell: ({ row }) => (
          <Badge variant={row.original.dofollow ? "success" : "neutral"}>
            {row.original.dofollow ? t("dofollow") : t("nofollow")}
          </Badge>
        ),
      },
      {
        id: "domainRank",
        accessorFn: (r) => r.domain_rank ?? 0,
        header: t("columns.domainRank"),
        meta: { label: t("columns.domainRank"), numeric: true },
        cell: ({ getValue }) => format.number(getValue() as number),
      },
      {
        id: "spam",
        accessorFn: (r) => r.spam_score ?? 0,
        header: t("columns.spam"),
        meta: { label: t("columns.spam"), numeric: true },
      },
      {
        id: "state",
        accessorFn: (r) => (r.is_lost ? "lost" : r.is_broken ? "broken" : "live"),
        header: t("columns.state"),
        meta: { label: t("columns.state") },
        cell: ({ row }) =>
          row.original.is_lost ? (
            <Badge variant="danger">{t("lost")}</Badge>
          ) : row.original.is_broken ? (
            <Badge variant="warning">{t("broken")}</Badge>
          ) : (
            <Badge variant="success">{t("live")}</Badge>
          ),
      },
      {
        id: "lastSeen",
        accessorFn: (r) => r.last_seen ?? "",
        header: t("columns.lastSeen"),
        meta: { label: t("columns.lastSeen") },
        cell: ({ row }) =>
          row.original.last_seen ? format.dateTime(new Date(row.original.last_seen), { dateStyle: "medium" }) : "—",
      },
    ],
    [t, format],
  );

  if (!enabled) {
    return (
      <EmptyState
        icon={Link2Icon}
        title={t("loadTitle")}
        description={t("loadBody")}
        action={
          <Button size="sm" variant="primary" onClick={() => setEnabled(true)}>
            <CloudDownloadIcon />
            {t("load")}
          </Button>
        }
      />
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <DataTable
        caption={t("caption")}
        data={query.data?.items ?? []}
        columns={columns}
        loading={query.isPending}
        minWidth={980}
        getRowId={(r) => `${r.source_url}-${r.target_url}`}
        csvFilename="backlinks.csv"
        empty={<EmptyState icon={Link2Icon} title={t("emptyTitle")} description={t("emptyBody")} compact />}
        toolbar={
          query.data && (
            <span className="flex items-center gap-2 text-small text-fg-2">
              <span className="num">{t("total", { count: total })}</span>
              {query.data.sandbox && <Badge variant="warning">{t("sandbox")}</Badge>}
            </span>
          )
        }
      />
      <Pager
        page={offset / BACKLINKS_PER_PAGE + 1}
        lastPage={lastPage}
        onPage={(p) => setOffset((p - 1) * BACKLINKS_PER_PAGE)}
        busy={query.isFetching}
      />
    </div>
  );
}

function ProspectsDialog({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("authority.prospects");
  const discover = useDiscoverProspects(siteId);
  const [competitor, setCompetitor] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [limit, setLimit] = React.useState(20);
  const ids = React.useId();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!competitor.trim()) return;
    discover.mutate(
      { competitor_domain: competitor.trim(), target_url: target.trim() || undefined, limit },
      {
        onSuccess: (result) => {
          toast.success(t("done", { count: result.processed, domain: result.competitor_domain }));
          setCompetitor("");
          setTarget("");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, t("failed"))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !discover.isPending && onOpenChange(o)}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-competitor`}>{t("competitor")}</Label>
            <Input
              id={`${ids}-competitor`}
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              placeholder={t("competitorPlaceholder")}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-target`}>{t("target")}</Label>
            <Input
              id={`${ids}-target`}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={t("targetPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-limit`}>{t("limit")}</Label>
            <Input
              id={`${ids}-limit`}
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
            />
          </div>
          <p className="text-caption font-normal text-fg-3">{t("cost")}</p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={discover.isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={discover.isPending} disabled={!competitor.trim()}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
