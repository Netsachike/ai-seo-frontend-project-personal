"use client";

import * as React from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format as formatDate,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  ListIcon,
  SparklesIcon,
} from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import { dateLocale } from "@/lib/date-locale";
import { getErrorMessage } from "@/lib/errors";
import type { ArticleStatus, ArticleSummary } from "@/lib/mocks/ui-data-work";
import { useContentMonth, useGeneratePlan, type CalendarEntry } from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { StatusBadge } from "@/components/brand/status-badge";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";
import { CalendarItemMenu } from "./item-actions";
import { PlansPanel } from "./planning-panels";

const views = ["calendar", "list", "plans"] as const;
const legend: ArticleStatus[] = ["published", "scheduled", "needsApproval", "draft"];
const dotClass: Record<ArticleStatus, string> = {
  published: "bg-success",
  scheduled: "bg-blue",
  needsApproval: "bg-warning",
  draft: "bg-fg-3",
};

const monthKey = (d: Date) => formatDate(d, "yyyy-MM");
/** Calendar days sit at local noon so formatting in any configured time zone keeps the same date. */
const atNoon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

export function ContentView() {
  const t = useTranslations("content");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60 * 60_000 });
  const { brand, brandSlug } = useShell();
  const [view, setView] = useQueryState("view", parseAsStringLiteral(views).withDefault("calendar"));
  const [month, setMonth] = useQueryState("month", parseAsString.withDefault(monthKey(now)));
  const monthDate = atNoon(parse(`${month}-01`, "yyyy-MM-dd", now));
  const query = useContentMonth(brand?.id, month);
  const generate = useGeneratePlan(brand?.id ?? 0);

  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={2} />;

  const articles = query.data ?? [];
  const monthName = format.dateTime(monthDate, { month: "long" });
  const nextMonthName = format.dateTime(addMonths(monthDate, 1), { month: "long" });
  const waiting = articles.filter((a) => a.status === "needsApproval");
  const published = articles.filter((a) => a.status === "published");

  const plan = () =>
    generate.mutate(monthKey(addMonths(monthDate, 1)), {
      onSuccess: () => toast.success(t("planned", { month: nextMonthName })),
      onError: (error) => toast.error(getErrorMessage(error, t("planFailed"))),
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={
          articles.length
            ? t("description", {
                month: monthName,
                count: articles.length,
                published: published.length,
                waiting: waiting.length,
              })
            : t("descriptionEmpty", { month: monthName })
        }
        actions={
          <>
            <Tabs value={view} onValueChange={(v) => void setView(v as (typeof views)[number])}>
              <TabsList variant="segmented" aria-label={t("viewLabel")}>
                <TabsTrigger value="calendar">
                  <CalendarDaysIcon className="size-4" />
                  {t("calendar")}
                </TabsTrigger>
                <TabsTrigger value="list">
                  <ListIcon className="size-4" />
                  {t("list")}
                </TabsTrigger>
                <TabsTrigger value="plans">{t("plansTab")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="primary" loading={generate.isPending} onClick={plan}>
              <SparklesIcon />
              {t("plan", { month: nextMonthName })}
            </Button>
          </>
        }
      />

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}

      {view === "plans" && <PlansPanel siteId={brand.id} />}

      <div className={cn("grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]", view === "plans" && "hidden")}>
        <Card className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("prevMonth")}
                onClick={() => void setMonth(monthKey(addMonths(monthDate, -1)))}
              >
                <ChevronLeftIcon className="rtl:-scale-x-100" />
              </Button>
              <h2 className="min-w-36 text-center text-h2">{format.dateTime(monthDate, "monthYear")}</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("nextMonth")}
                onClick={() => void setMonth(monthKey(addMonths(monthDate, 1)))}
              >
                <ChevronRightIcon className="rtl:-scale-x-100" />
              </Button>
            </div>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label={t("legend")}>
              {legend.map((s) => (
                <li key={s} className="flex items-center gap-1.5 text-caption font-normal text-fg-2">
                  <span aria-hidden className={cn("size-2 rounded-full", dotClass[s])} />
                  {t(`status.${s}`)}
                </li>
              ))}
            </ul>
          </div>

          {articles.length === 0 ? (
            <EmptyState
              compact
              icon={FileTextIcon}
              title={t("emptyTitle", { month: monthName })}
              description={t("emptyDescription")}
            />
          ) : view === "calendar" ? (
            <MonthGrid month={monthDate} articles={articles} brandSlug={brandSlug} />
          ) : (
            <ArticleTable articles={articles} brandSlug={brandSlug} siteId={brand.id} />
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>{t("thisMonth")}</CardTitle>
            <dl className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <dd className="text-metric text-fg">{articles.length}</dd>
                <dt className="text-caption font-normal text-fg-3">{t("articlesPlanned")}</dt>
              </div>
              <div className="flex flex-col gap-1">
                <dd className="text-metric text-fg">
                  {format.number(
                    articles.length ? articles.reduce((s, a) => s + a.score, 0) / articles.length : 0,
                    "integer",
                  )}
                </dd>
                <dt className="text-caption font-normal text-fg-3">{t("avgScore")}</dt>
              </div>
            </dl>
            {articles.length > 0 && <p className="text-small text-fg-2">{t("why")}</p>}
          </Card>
          <Card>
            <div className="flex flex-col gap-0.5">
              <CardTitle>{t("waitingTitle")}</CardTitle>
              <CardDescription>{t("waitingDescription")}</CardDescription>
            </div>
            {waiting.length === 0 ? (
              <p className="text-small text-fg-3">{t("waitingEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {waiting.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1">
                    <Link
                      href={brandHref(brandSlug, `articles/${a.id}`)}
                      className="text-small font-medium text-fg hover:text-blue hover:underline"
                    >
                      {a.title}
                    </Link>
                    <span className="text-caption font-normal text-fg-3">
                      {t("waitingMeta", {
                        score: a.score,
                        date: format.dateTime(new Date(`${a.date}T09:00:00`), "short"),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Week start follows the UI locale (Sunday in en-US, Saturday in ar, Monday in de/fr). */
function MonthGrid({ month, articles, brandSlug }: { month: Date; articles: CalendarEntry[]; brandSlug: string }) {
  const t = useTranslations("content");
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow({ updateInterval: 60 * 60_000 });
  const dfLocale = dateLocale(locale);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { locale: dfLocale }),
    end: endOfWeek(endOfMonth(month), { locale: dfLocale }),
  }).map(atNoon);
  const byDay = (d: Date) => articles.filter((a) => a.date === formatDate(d, "yyyy-MM-dd"));
  const today = formatDate(now, "yyyy-MM-dd");

  return (
    <>
      {/* Desktop: month grid */}
      <div className="hidden md:block">
        <div role="row" className="grid grid-cols-7 border-b border-border pb-2">
          {days.slice(0, 7).map((d) => (
            <span key={d.toISOString()} role="columnheader" className="px-2 text-overline text-fg-3">
              {format.dateTime(d, "weekday")}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const items = byDay(d);
            const inMonth = isSameMonth(d, month);
            const isToday = formatDate(d, "yyyy-MM-dd") === today;
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "flex min-h-28 flex-col gap-1 border-e border-b border-border p-1.5 [&:nth-child(7n)]:border-e-0",
                  !inMonth && "bg-bg",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full num text-caption",
                    isToday ? "bg-ink font-semibold text-ink-fg" : inMonth ? "text-fg-2" : "text-fg-3",
                  )}
                  aria-current={isToday ? "date" : undefined}
                >
                  {format.number(d.getDate(), "integer")}
                </span>
                {items.map((a) => (
                  <Link
                    key={a.id}
                    href={brandHref(brandSlug, `articles/${a.id}`)}
                    title={`${a.title} · ${t(`status.${a.status}`)}`}
                    className="flex items-center gap-1.5 rounded-sm bg-surface-2 px-1.5 py-1 text-caption font-normal text-fg hover:bg-border"
                  >
                    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dotClass[a.status])} />
                    <span className="truncate">{a.title}</span>
                    <span className="sr-only">{t(`status.${a.status}`)}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: agenda */}
      <ol className="flex flex-col divide-y divide-border md:hidden">
        {articles.map((a) => (
          <li key={a.id}>
            <Link href={brandHref(brandSlug, `articles/${a.id}`)} className="flex items-center gap-3 py-3">
              <span className="w-12 shrink-0 num text-caption text-fg-2">
                {format.dateTime(new Date(`${a.date}T09:00:00`), "short")}
              </span>
              <span className="min-w-0 flex-1 text-small text-fg">{a.title}</span>
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dotClass[a.status])} />
              <span className="sr-only">{t(`status.${a.status}`)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

function ArticleTable({
  articles,
  brandSlug,
  siteId,
}: {
  articles: CalendarEntry[];
  brandSlug: string;
  siteId: number;
}) {
  const t = useTranslations("content.table");
  const tContent = useTranslations("content");
  const format = useFormatter();
  const columns = React.useMemo<DataColumn<CalendarEntry>[]>(
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
        accessorKey: "status",
        header: t("status"),
        meta: { label: t("status"), csv: (r) => tContent(`status.${(r as ArticleSummary).status}`) },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "date",
        header: t("date"),
        meta: { label: t("date"), numeric: true },
        cell: ({ row }) => format.dateTime(new Date(`${row.original.date}T09:00:00`), "medium"),
      },
      { accessorKey: "score", header: t("score"), meta: { label: t("score"), numeric: true } },
      { accessorKey: "keyword", header: t("keyword"), meta: { label: t("keyword") } },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("actions")}</span>,
        enableSorting: false,
        cell: ({ row }) => <CalendarItemMenu siteId={siteId} entry={row.original} />,
      },
    ],
    [t, tContent, format, brandSlug, siteId],
  );
  return (
    <div className="-mx-5 -mb-5 border-t border-border">
      <DataTable
        caption={t("caption")}
        data={articles}
        columns={columns}
        getRowId={(r) => r.id}
        csvFilename="content-plan.csv"
      />
    </div>
  );
}
