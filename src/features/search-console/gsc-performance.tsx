"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCwIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { GscQuery } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { toNumber } from "@/services/api/helpers";
import { PlatformLogo } from "@/components/brand/platform-logo";
import { ErrorState } from "@/components/brand/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isGscReady, useGscOverview, useSyncGsc } from "./hooks";

type QueryTotal = { query: string; page: string; clicks: number; impressions: number; position: number };

/** The overview returns one row per query, page and day: add them up per query. */
function topQueries(rows: GscQuery[], limit: number): QueryTotal[] {
  const byQuery = new Map<string, QueryTotal & { weighted: number }>();
  for (const row of rows) {
    const position = toNumber(row.position) ?? 0;
    const entry = byQuery.get(row.query) ?? {
      query: row.query,
      page: row.page,
      clicks: 0,
      impressions: 0,
      position: 0,
      weighted: 0,
    };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    entry.weighted += position * Math.max(row.impressions, 1);
    byQuery.set(row.query, entry);
  }
  return [...byQuery.values()]
    .map(({ weighted, ...entry }) => ({ ...entry, position: weighted / Math.max(entry.impressions, 1) }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit);
}

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

/**
 * How the site does in Google search, from Search Console: clicks,
 * impressions, click rate, average position and the searches that bring
 * people in. A property that was never synced is synced once, here.
 */
export function GscPerformanceCard({
  siteId,
  connectHref,
  queries: limit = 10,
}: {
  siteId: number;
  /** Where to connect Search Console when it isn't connected yet. */
  connectHref: string;
  queries?: number;
}) {
  const t = useTranslations("searchConsole");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const overview = useGscOverview(siteId);
  const sync = useSyncGsc(siteId);
  const connection = overview.data?.connection;
  const ready = isGscReady(connection);

  // Selecting a property starts a sync; if it never ran (closed tab, error), run it once now.
  const autoSynced = React.useRef(false);
  React.useEffect(() => {
    if (ready && connection && !connection.last_synced_at && !autoSynced.current) {
      autoSynced.current = true;
      sync.mutate();
    }
  }, [ready, connection, sync]);

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (result) => toast.success(t("synced", { rows: result.rows_processed })),
      onError: (error) => toast.error(getErrorMessage(error, t("syncFailed"))),
    });

  if (overview.isPending) return <Skeleton className="h-56 rounded-xl" />;
  if (overview.isError) return <ErrorState compact onRetry={() => overview.refetch()} />;

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-white">
          <PlatformLogo platform="searchConsole" size={20} />
        </span>
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {ready && connection?.property
              ? t("description", { property: connection.property.replace(/^sc-domain:/, "") })
              : t("notConnectedBody")}
          </CardDescription>
        </div>
      </div>
      {ready ? (
        <div className="flex items-center gap-3">
          {connection?.last_synced_at && (
            <span className="text-caption font-normal text-fg-3">
              {t("lastSynced", { when: format.relativeTime(new Date(connection.last_synced_at), now) })}
            </span>
          )}
          <Button size="sm" variant="secondary" loading={sync.isPending} onClick={runSync}>
            <RefreshCwIcon />
            {t("sync")}
          </Button>
        </div>
      ) : (
        <Button asChild size="sm" variant="primary">
          <Link href={connectHref}>{t("connect")}</Link>
        </Button>
      )}
    </div>
  );

  if (!ready)
    return (
      <Card data-tour="gsc-card" className="gap-4">
        {header}
      </Card>
    );

  const a = overview.data.analytics;
  const ctr = toNumber(a.ctr);
  const position = toNumber(a.average_position);
  const stats = [
    { key: "clicks", value: format.number(toNumber(a.total_clicks) ?? 0, "integer") },
    { key: "impressions", value: format.number(toNumber(a.total_impressions) ?? 0, "integer") },
    { key: "ctr", value: ctr === null ? "—" : format.number(ctr, { style: "percent", maximumFractionDigits: 1 }) },
    { key: "position", value: position === null ? "—" : format.number(position, { maximumFractionDigits: 1 }) },
  ] as const;
  const top = topQueries(overview.data.queries, limit);

  return (
    <Card data-tour="gsc-card" className="gap-5">
      {header}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.key} className="flex flex-col gap-1 bg-surface p-4">
            <dt className="text-overline text-fg-3">{t(`stats.${s.key}`)}</dt>
            <dd className="text-metric num text-fg">{s.value}</dd>
            <dd className="text-caption font-normal text-fg-3">{t(`stats.${s.key}Help`)}</dd>
          </div>
        ))}
      </dl>

      {sync.isPending && !connection?.last_synced_at ? (
        <p role="status" className="text-small text-fg-2">
          {t("firstSync")}
        </p>
      ) : top.length === 0 ? (
        <p className="text-small text-fg-2">{t("noQueries")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <h3 className="text-small font-semibold text-fg">{t("topQueries")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-small">
              <thead>
                <tr className="border-b border-border text-start text-caption text-fg-3">
                  <th className="py-2 pe-3 text-start font-medium">{t("columns.query")}</th>
                  <th className="py-2 pe-3 text-start font-medium">{t("columns.page")}</th>
                  <th className="py-2 pe-3 text-end font-medium">{t("columns.clicks")}</th>
                  <th className="py-2 pe-3 text-end font-medium">{t("columns.impressions")}</th>
                  <th className="py-2 text-end font-medium">{t("columns.position")}</th>
                </tr>
              </thead>
              <tbody>
                {top.map((row) => (
                  <tr key={row.query} className="border-b border-border last:border-0">
                    <td dir="auto" className="max-w-[16rem] truncate py-2 pe-3 font-medium text-fg">
                      {row.query}
                    </td>
                    <td
                      dir="ltr"
                      className="max-w-[14rem] truncate py-2 pe-3 text-start font-mono text-[12px] text-fg-2"
                    >
                      {pathOf(row.page)}
                    </td>
                    <td className="py-2 pe-3 text-end num text-fg">{format.number(row.clicks, "integer")}</td>
                    <td className="py-2 pe-3 text-end num text-fg-2">{format.number(row.impressions, "integer")}</td>
                    <td className="py-2 text-end num text-fg-2">
                      {format.number(row.position, { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
