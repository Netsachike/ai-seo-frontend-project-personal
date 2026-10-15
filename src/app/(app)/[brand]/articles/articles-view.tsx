"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileTextIcon, FlaskConicalIcon } from "lucide-react";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ArticleWithRelations } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { statusVariant, useArticlesPage, useResearchKeyword } from "@/features/content/hooks";
import { keywordQualityOf, useKeywordsPage } from "@/features/topics/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { Pager } from "@/components/brand/pager";
import { PipelineSteps } from "@/components/brand/pipeline-steps";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";
import { ResearchPanel } from "./research-panel";

const views = ["articles", "research"] as const;
const knownStatuses = ["generating", "draft", "publishing", "published", "failed"] as const;
const isKnownStatus = (status: string): status is (typeof knownStatuses)[number] =>
  (knownStatuses as readonly string[]).includes(status);

/**
 * Articles: everything Rankoya has written, and the research briefs they are
 * written from. Research starts from an accepted keyword; a completed brief
 * is then written up into an article.
 */
export function ArticlesView() {
  const t = useTranslations("articles");
  const { brand } = useShell();
  const [view, setView] = useQueryState("view", parseAsStringLiteral(views).withDefault("articles"));
  const [researchOpen, setResearchOpen] = React.useState(false);

  if (!brand) return <PageSkeleton kpis={0} panels={2} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="primary" onClick={() => setResearchOpen(true)}>
            <FlaskConicalIcon />
            {t("researchKeyword")}
          </Button>
        }
      />

      <PipelineSteps page="articles" />

      <Tabs value={view} onValueChange={(v) => void setView(v as (typeof views)[number])}>
        <TabsList aria-label={t("viewLabel")}>
          {views.map((v) => (
            <TabsTrigger key={v} value={v}>
              {t(`views.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === "research" ? <ResearchPanel siteId={brand.id} /> : <ArticlesTable siteId={brand.id} />}

      <ResearchDialog siteId={brand.id} open={researchOpen} onOpenChange={setResearchOpen} />
    </div>
  );
}

function ArticlesTable({ siteId }: { siteId: number }) {
  const t = useTranslations("articles.table");
  const format = useFormatter();
  const { brandSlug } = useShell();
  const [page, setPage] = useQueryState("ap", parseAsInteger.withDefault(1));
  const query = useArticlesPage(siteId, page);

  const columns = React.useMemo<DataColumn<ArticleWithRelations>[]>(
    () => [
      {
        accessorKey: "title",
        header: t("title"),
        meta: { label: t("title"), pinned: true },
        cell: ({ row }) => (
          <Link
            href={brandHref(brandSlug, `articles/${row.original.id}`)}
            className="font-medium text-fg hover:text-blue hover:underline"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        id: "keyword",
        accessorFn: (r) => r.keyword?.keyword ?? "",
        header: t("keyword"),
        meta: { label: t("keyword") },
        cell: ({ row }) => row.original.keyword?.keyword ?? "—",
      },
      {
        accessorKey: "status",
        header: t("status"),
        meta: { label: t("status") },
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge variant={status === "draft" ? "warning" : statusVariant(status)}>
              {isKnownStatus(status) ? t(`statusValue.${status}`) : status}
            </Badge>
          );
        },
      },
      {
        id: "words",
        accessorFn: (r) => r.word_count ?? 0,
        header: t("words"),
        meta: { label: t("words"), numeric: true },
        cell: ({ getValue }) => format.number(getValue() as number),
      },
      {
        id: "updated",
        accessorFn: (r) => r.updated_at,
        header: t("updated"),
        meta: { label: t("updated"), numeric: true },
        cell: ({ row }) => format.dateTime(new Date(row.original.updated_at), { dateStyle: "medium" }),
      },
    ],
    [t, format, brandSlug],
  );

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <DataTable
        caption={t("caption")}
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending}
        minWidth={760}
        getRowId={(r) => String(r.id)}
        csvFilename="articles.csv"
        empty={
          <EmptyState
            icon={FileTextIcon}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={
              <Button asChild size="sm" variant="secondary">
                <Link href={brandHref(brandSlug, "keywords")}>{t("emptyAction")}</Link>
              </Button>
            }
            compact
          />
        }
        toolbar={
          query.data && <span className="num text-small text-fg-2">{t("total", { count: query.data.total })}</span>
        }
      />
      <Pager
        page={page}
        lastPage={query.data?.last_page ?? 1}
        onPage={(p) => void setPage(p)}
        busy={query.isFetching}
      />
    </div>
  );
}

/** Pick an accepted keyword and research it. Only accepted keywords can be researched. */
function ResearchDialog({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("articles.researchDialog");
  const router = useRouter();
  const { brandSlug } = useShell();
  const keywords = useKeywordsPage(siteId, 1);
  const research = useResearchKeyword(siteId);
  const [keywordId, setKeywordId] = React.useState("");
  const accepted = (keywords.data?.data ?? []).filter((k) => keywordQualityOf(k) === "accepted");

  const submit = () =>
    research.mutate(Number(keywordId), {
      onSuccess: (brief) => {
        toast.success(t("done"));
        setKeywordId("");
        onOpenChange(false);
        router.replace(brandHref(brandSlug, `articles?view=research&brief=${brief.id}`));
      },
      onError: (error) => toast.error(getErrorMessage(error, t("failed"))),
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !research.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        {keywords.isPending ? (
          <PageSkeleton kpis={0} panels={1} />
        ) : accepted.length === 0 ? (
          <p className="text-small text-fg-2">
            {t("none")}{" "}
            <Link href={brandHref(brandSlug, "keywords")} className="font-medium text-blue hover:underline">
              {t("goKeywords")}
            </Link>
          </p>
        ) : (
          <Select value={keywordId} onValueChange={setKeywordId}>
            <SelectTrigger aria-label={t("keywordLabel")} className="w-full">
              <SelectValue placeholder={t("keywordPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {accepted.map((k) => (
                <SelectItem key={k.id} value={String(k.id)}>
                  {k.keyword}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {research.isPending && <p className="text-caption font-normal text-fg-3">{t("slow")}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={research.isPending}>
            {t("cancel")}
          </Button>
          <Button variant="primary" onClick={submit} disabled={!keywordId} loading={research.isPending}>
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
