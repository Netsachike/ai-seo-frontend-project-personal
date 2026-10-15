"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  CircleDollarSignIcon,
  MonitorIcon,
  FileTextIcon,
  FlaskConicalIcon,
  KeyRoundIcon,
  LayersIcon,
  NetworkIcon,
  PlusIcon,
  RefreshCwIcon,
  ScanSearchIcon,
  TargetIcon,
} from "lucide-react";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { CrawlPage, Keyword, TopicalMapDetail } from "@/types/types";
import { WithPagePreview } from "@/components/crawl/page-inspector";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toNumber } from "@/services/api/helpers";
import { useResearchKeyword } from "@/features/content/hooks";
import {
  keywordQualityOf,
  useAnalyzeKeywords,
  useBuildMap,
  useGrowMap,
  useKeywordsPage,
  useTopicalMap,
  useTopicalMaps,
} from "@/features/topics/hooks";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/account/stat-card";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { Pager } from "@/components/brand/pager";
import { PipelineSteps } from "@/components/brand/pipeline-steps";
import { ScoreRing } from "@/components/brand/score-ring";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

const views = ["keywords", "map"] as const;
const filters = ["accepted", "rejected", "all"] as const;
type Cluster = TopicalMapDetail["clusters"][number];

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

/**
 * Keywords: discover them, analyze them (accepted or rejected), and research
 * an accepted one to start an article. The topical map groups the same
 * keywords into clusters and sits in its own tab.
 */
export function KeywordsView() {
  const t = useTranslations("keywords");
  const { brand } = useShell();
  const siteId = brand?.id ?? 0;
  const [view, setView] = useQueryState("view", parseAsStringLiteral(views).withDefault("keywords"));
  const analyze = useAnalyzeKeywords(siteId);
  const [growOpen, setGrowOpen] = React.useState(false);

  const runAnalyze = () =>
    analyze.mutate(undefined, {
      onSuccess: ({ quality }) =>
        toast.success(t("analyzed", { accepted: quality.accepted, rejected: quality.rejected })),
      onError: (error) => toast.error(getErrorMessage(error, t("analyzeFailed"))),
    });

  if (!brand) return <PageSkeleton kpis={0} panels={2} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description", { domain: brand.domain })}
        actions={
          <>
            <Button variant="secondary" onClick={runAnalyze} loading={analyze.isPending}>
              <ScanSearchIcon />
              {t("analyze")}
            </Button>
            <Button variant="primary" onClick={() => setGrowOpen(true)}>
              <PlusIcon />
              {t("grow.open")}
            </Button>
          </>
        }
      />

      <PipelineSteps page="keywords" />

      <Tabs value={view} onValueChange={(v) => void setView(v as (typeof views)[number])}>
        <TabsList aria-label={t("viewLabel")}>
          {views.map((v) => (
            <TabsTrigger key={v} value={v}>
              {t(`views.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === "map" ? (
        <TopicalMapPanel siteId={siteId} onGrow={() => setGrowOpen(true)} />
      ) : (
        <KeywordsTable siteId={siteId} onAnalyze={runAnalyze} analyzing={analyze.isPending} />
      )}

      <GrowDialog siteId={siteId} open={growOpen} onOpenChange={setGrowOpen} />
    </div>
  );
}

/** Keywords on the current page (100, by opportunity score), filtered by analysis result. */
function KeywordsTable({
  siteId,
  onAnalyze,
  analyzing,
}: {
  siteId: number;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  const t = useTranslations("keywords.table");
  const format = useFormatter();
  const router = useRouter();
  const { brandSlug } = useShell();
  const [page, setPage] = useQueryState("kp", parseAsInteger.withDefault(1));
  const [filter, setFilter] = useQueryState("kf", parseAsStringLiteral(filters).withDefault("accepted"));
  const query = useKeywordsPage(siteId, page);
  const research = useResearchKeyword(siteId);

  const startResearch = React.useCallback(
    (keyword: Keyword) =>
      research.mutate(keyword.id, {
        onSuccess: (brief) => {
          toast.success(t("researched", { keyword: keyword.keyword }));
          router.push(brandHref(brandSlug, `articles?view=research&brief=${brief.id}`));
        },
        onError: (error) => toast.error(getErrorMessage(error, t("researchFailed"))),
      }),
    [research, router, brandSlug, t],
  );

  const all = query.data?.data ?? [];
  const rows = filter === "all" ? all : all.filter((k) => keywordQualityOf(k) === filter);
  const unanalyzed = all.filter((k) => keywordQualityOf(k) === null).length;
  const researchingId = research.isPending ? research.variables : null;

  const columns = React.useMemo<DataColumn<Keyword>[]>(
    () => [
      {
        accessorKey: "keyword",
        header: t("keyword"),
        meta: { label: t("keyword"), pinned: true },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col">
            <span className="font-medium text-fg">{row.original.keyword}</span>
            {keywordQualityOf(row.original) === "rejected" && row.original.quality.rejection_reason && (
              <span className="text-caption font-normal text-fg-3">{row.original.quality.rejection_reason}</span>
            )}
          </span>
        ),
      },
      {
        id: "quality",
        accessorFn: (r) => keywordQualityOf(r) ?? "",
        header: t("quality"),
        meta: { label: t("quality") },
        cell: ({ row }) => {
          const quality = keywordQualityOf(row.original);
          return (
            <Badge variant={quality === "accepted" ? "success" : quality === "rejected" ? "danger" : "neutral"}>
              {t(`qualityValue.${quality ?? "unanalyzed"}`)}
            </Badge>
          );
        },
      },
      {
        id: "volume",
        accessorFn: (r) => r.metrics.search_volume ?? -1,
        header: t("volume"),
        meta: { label: t("volume"), numeric: true },
        cell: ({ row }) =>
          row.original.metrics.search_volume === null ? "—" : format.number(row.original.metrics.search_volume),
      },
      {
        id: "difficulty",
        accessorFn: (r) => toNumber(r.metrics.keyword_difficulty) ?? 0,
        header: t("difficulty"),
        meta: { label: t("difficulty"), numeric: true },
        cell: ({ getValue }) => Math.round(getValue() as number),
      },
      {
        id: "opportunity",
        accessorFn: (r) => toNumber(r.metrics.opportunity_score ?? r.scoring.opportunity_score) ?? 0,
        header: t("opportunity"),
        meta: { label: t("opportunity"), numeric: true },
        cell: ({ getValue }) => Math.round(getValue() as number),
      },
      {
        id: "intent",
        accessorFn: (r) => r.intent ?? "",
        header: t("intent"),
        meta: { label: t("intent") },
        cell: ({ row }) => (row.original.intent ? <Badge variant="outline">{row.original.intent}</Badge> : "—"),
      },
      {
        id: "cluster",
        accessorFn: (r) => r.cluster ?? "",
        header: t("cluster"),
        meta: { label: t("cluster") },
        cell: ({ row }) => <span className="block max-w-[14rem] truncate">{row.original.cluster ?? "—"}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("actions")}</span>,
        enableSorting: false,
        cell: ({ row }) =>
          keywordQualityOf(row.original) === "accepted" ? (
            <Button
              size="sm"
              variant="secondary"
              loading={researchingId === row.original.id}
              disabled={researchingId !== null && researchingId !== row.original.id}
              onClick={() => startResearch(row.original)}
            >
              <FlaskConicalIcon />
              {researchingId === row.original.id ? t("researching") : t("research")}
            </Button>
          ) : null,
      },
    ],
    [t, format, researchingId, startResearch],
  );

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      {unanalyzed > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-bg px-4 py-3">
          <p className="text-small text-warning">{t("unanalyzed", { count: unanalyzed })}</p>
          <Button size="sm" variant="secondary" onClick={onAnalyze} loading={analyzing}>
            <ScanSearchIcon />
            {t("analyzeNow")}
          </Button>
        </div>
      )}
      {research.isPending && (
        <p role="status" className="rounded-lg bg-surface-2 px-4 py-3 text-small text-fg-2">
          {t("researchingNote")}
        </p>
      )}
      <DataTable
        caption={t("caption")}
        data={rows}
        columns={columns}
        loading={query.isPending}
        minWidth={960}
        getRowId={(r) => String(r.id)}
        csvFilename="keywords.csv"
        empty={
          <EmptyState
            icon={KeyRoundIcon}
            title={all.length ? t(`emptyFilter.${filter}`) : t("emptyTitle")}
            description={all.length ? undefined : t("emptyBody")}
            compact
          />
        }
        toolbar={
          <>
            <Tabs value={filter} onValueChange={(v) => void setFilter(v as (typeof filters)[number])}>
              <TabsList variant="segmented" aria-label={t("filterLabel")}>
                {filters.map((f) => (
                  <TabsTrigger key={f} value={f}>
                    {t(`filter.${f}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {query.data && (
              <span className="num text-small text-fg-2">{t("total", { count: query.data.meta.total })}</span>
            )}
          </>
        }
      />
      <Pager
        page={page}
        lastPage={query.data?.meta.last_page ?? 1}
        onPage={(p) => void setPage(p)}
        busy={query.isFetching}
      />
    </div>
  );
}

/** The topical map: keywords grouped into clusters, which page targets each, and coverage. */
function TopicalMapPanel({ siteId, onGrow }: { siteId: number; onGrow: () => void }) {
  const t = useTranslations("keywords.map");
  const format = useFormatter();
  const [mapParam, setMapParam] = useQueryState("map", parseAsInteger);
  const maps = useTopicalMaps(siteId);
  const mapId = mapParam ?? maps.data?.[0]?.id ?? null;
  const map = useTopicalMap(siteId, mapId);
  const build = useBuildMap(siteId);
  const [preview, setPreview] = React.useState<CrawlPage | null>(null);

  const rebuild = () =>
    build.mutate(undefined, {
      onSuccess: (result) => {
        if (result.topical_map) void setMapParam(null);
        toast.success(
          result.topical_map ? t("built", { clusters: result.clusters, keywords: result.keywords }) : t("builtEmpty"),
        );
      },
      onError: (error) => toast.error(getErrorMessage(error, t("buildFailed"))),
    });

  if (maps.isPending) return <PageSkeleton kpis={4} panels={1} />;
  if (maps.isError || map.isError)
    return <ErrorState onRetry={() => void Promise.all([maps.refetch(), map.refetch()])} />;

  if (maps.data.length === 0)
    return (
      <EmptyState
        icon={NetworkIcon}
        title={t("emptyTitle")}
        description={t("emptyBody")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={onGrow}>
              {t("discoverFirst")}
            </Button>
            <Button size="sm" variant="primary" onClick={rebuild} loading={build.isPending}>
              {t("build")}
            </Button>
          </div>
        }
      />
    );

  const detail = map.data;
  const clusters = detail?.clusters ?? [];
  const withPage = clusters.filter((c) => c.target_page_id !== null).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
        <Card className="items-center justify-center gap-2">
          <ScoreRing score={detail ? (toNumber(detail.coverage_score) ?? 0) : 0} label={t("coverage")} />
          <span className="text-small font-medium text-fg">{t("coverage")}</span>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={LayersIcon} label={t("stats.clusters")} value={format.number(detail?.clusters_count ?? 0)} />
          <StatCard
            icon={KeyRoundIcon}
            label={t("stats.keywords")}
            value={format.number(detail?.keywords_count ?? 0)}
          />
          <StatCard
            icon={TargetIcon}
            label={t("stats.mapped")}
            value={format.number(detail?.mapped_keywords_count ?? 0)}
          />
          <StatCard
            icon={FileTextIcon}
            label={t("stats.withPage")}
            value={t("stats.withPageValue", { covered: withPage, total: clusters.length })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {maps.data.length > 1 ? (
          <Select value={String(mapId)} onValueChange={(v) => void setMapParam(Number(v))}>
            <SelectTrigger aria-label={t("mapLabel")} className="h-8 w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {maps.data.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {t("mapOption", {
                    name: m.name,
                    date: format.dateTime(new Date(m.created_at), { dateStyle: "medium" }),
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span />
        )}
        <Button size="sm" variant="secondary" onClick={rebuild} loading={build.isPending}>
          <RefreshCwIcon />
          {t("rebuild")}
        </Button>
      </div>

      {map.isPending ? (
        <PageSkeleton kpis={0} panels={1} />
      ) : clusters.length === 0 ? (
        <EmptyState icon={LayersIcon} title={t("noClustersTitle")} description={t("noClustersBody")} />
      ) : (
        <WithPagePreview page={preview} onClose={() => setPreview(null)}>
          <ul className={cn("grid gap-4", !preview && "lg:grid-cols-2")}>
            {clusters.map((cluster) => (
              <li key={cluster.id}>
                <ClusterCard cluster={cluster} onPreview={setPreview} />
              </li>
            ))}
          </ul>
        </WithPagePreview>
      )}
    </div>
  );
}

/** One cluster: its core topic, coverage, the page that targets it and its keywords. */
function ClusterCard({ cluster, onPreview }: { cluster: Cluster; onPreview: (page: CrawlPage) => void }) {
  const t = useTranslations("keywords.map.cluster");
  const format = useFormatter();
  const { brandSlug } = useShell();
  const coverage = toNumber(cluster.coverage_score) ?? 0;
  const volume = cluster.keywords.reduce((sum, k) => sum + (k.search_volume ?? 0), 0);
  const keywords = [...cluster.keywords].sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0));
  return (
    <Card className="h-full gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="truncate">{cluster.core_topic || cluster.name}</CardTitle>
          {cluster.core_topic && cluster.core_topic !== cluster.name && (
            <CardDescription className="truncate">{cluster.name}</CardDescription>
          )}
        </div>
        {cluster.money_page && (
          <Badge variant="success" shape="pill">
            <CircleDollarSignIcon />
            {t("moneyPage")}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-small">
          <span className="text-fg-2">{t("coverage")}</span>
          <span className="num font-medium text-fg">{format.number(coverage / 100, "percent")}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn(
              "h-full rounded-full",
              coverage >= 70 ? "bg-success" : coverage >= 40 ? "bg-warning" : "bg-danger",
            )}
            style={{ width: `${Math.min(100, coverage)}%` }}
          />
        </div>
      </div>

      <p className="num text-small text-fg-2">
        {t("summary", { keywords: cluster.keyword_count, mapped: cluster.mapped_keyword_count, volume })}
      </p>

      {cluster.strategy && <p className="text-small text-fg-2">{cluster.strategy}</p>}

      <div className="rounded-lg bg-surface-2/60 p-3 text-small">
        {cluster.target_page ? (
          <button
            type="button"
            onClick={() => onPreview(cluster.target_page as CrawlPage)}
            className="inline-flex min-w-0 items-center gap-1 text-start text-fg hover:text-blue"
          >
            <span className="text-fg-3">{t("targetPage")}</span>
            <span className="truncate font-medium">{pathOf(cluster.target_page.url)}</span>
            <MonitorIcon aria-hidden className="size-3.5 shrink-0" />
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-fg-2">{t("noPage")}</span>
            <Button asChild size="sm" variant="secondary">
              <Link href={brandHref(brandSlug, "calendar")}>
                <FileTextIcon />
                {t("planContent")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {keywords.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1.5 text-small font-medium text-blue hover:underline">
            {t("keywords", { count: keywords.length })}
            <ChevronDownIcon aria-hidden className="size-4 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border">
              {keywords.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 px-3 py-2 text-small">
                  <span className="min-w-0 truncate text-fg">{k.keyword}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    {k.intent && <Badge variant="outline">{k.intent}</Badge>}
                    <span className="w-16 text-end num text-fg-2">{format.number(k.search_volume ?? 0)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}

/** Discover keywords (from the latest crawl plus optional seeds), analyze them and rebuild the map. */
function GrowDialog({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("keywords.grow");
  const grow = useGrowMap(siteId);
  const [seeds, setSeeds] = React.useState("");
  const list = seeds
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 100);

  const submit = () =>
    grow.mutate(list, {
      onSuccess: ({ discovered, built }) => {
        toast.success(t("done", { keywords: discovered.keywords_discovered, clusters: built.clusters }));
        setSeeds("");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error, t("failed"))),
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !grow.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label={t("seedsLabel")}
          placeholder={t("seedsPlaceholder")}
          value={seeds}
          onChange={(e) => setSeeds(e.target.value)}
          className="min-h-32"
        />
        <p className="text-caption font-normal text-fg-3">{t("hint", { count: list.length })}</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={grow.isPending}>
            {t("cancel")}
          </Button>
          <Button variant="primary" onClick={submit} loading={grow.isPending}>
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
