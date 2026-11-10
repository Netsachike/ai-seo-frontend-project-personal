"use client";

import { AlertTriangleIcon, CoinsIcon, HistoryIcon, RefreshCwIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { ApiUsageLog } from "@/types/types";
import { LOW_BALANCE_RATIO, useCreditBalance } from "@/features/credits/use-credit-balance";
import { EmptyState } from "@/components/brand/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const KNOWN_OPERATIONS = ["google_organic_live_advanced", "google_keyword_suggestions_live"] as const;
const KNOWN_STATUSES = ["reserved", "completed", "failed", "released", "unresolved", "reconciled"] as const;

const statusVariant: Record<string, "success" | "warning" | "neutral" | "blue"> = {
  completed: "success",
  reconciled: "success",
  reserved: "blue",
  unresolved: "warning",
  failed: "neutral",
  released: "neutral",
};

/**
 * Credit balance, what's held for running tasks, what's been spent, and the
 * last 10 paid tasks (GET /credits/balance). The 25% warning follows the
 * funnel spec; "received" is derived until the backend reports grants.
 */
export function CreditsTab() {
  const t = useTranslations("account.credits");
  const format = useFormatter();
  const { enabled, data, summary, isPending, isError, error, refetch, isFetching } = useCreditBalance();

  const header = (
    <CardHeader>
      <div className="flex flex-col gap-0.5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>
    </CardHeader>
  );

  if (!enabled) {
    return (
      <Card>
        {header}
        <EmptyState compact icon={CoinsIcon} title={t("unavailableTitle")} description={t("unavailableBody")} />
      </Card>
    );
  }

  if (isPending) return <Skeleton className="h-96" />;

  if (isError || !data || !summary) {
    return (
      <Card>
        {header}
        <EmptyState
          compact
          icon={AlertTriangleIcon}
          title={t("errorTitle")}
          description={getErrorMessage(error, t("errorBody"))}
          action={
            <Button size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCwIcon className={cn(isFetching && "animate-spin")} />
              {t("retry")}
            </Button>
          }
        />
      </Card>
    );
  }

  const pct = Math.round(summary.remainingRatio * 100);
  const tone = summary.isEmpty ? "danger" : summary.isLow ? "warning" : "blue";
  const n = (value: number) => format.number(value);

  const operationLabel = (op: string) =>
    (KNOWN_OPERATIONS as readonly string[]).includes(op)
      ? t(`operations.${op as (typeof KNOWN_OPERATIONS)[number]}`)
      : op.replace(/[_-]+/g, " ");
  const statusLabel = (status: string) =>
    (KNOWN_STATUSES as readonly string[]).includes(status)
      ? t(`statuses.${status as (typeof KNOWN_STATUSES)[number]}`)
      : status;
  const creditsFor = (row: ApiUsageLog) =>
    row.status === "completed" || row.status === "reconciled"
      ? row.credits_charged
      : row.status === "reserved" || row.status === "unresolved"
        ? row.credits_reserved
        : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={t("refresh")}
          >
            <RefreshCwIcon className={cn(isFetching && "animate-spin")} />
            <span className="hidden sm:inline">{t("refresh")}</span>
          </Button>
        </CardHeader>

        {(summary.isEmpty || summary.isLow) && (
          <div
            role="status"
            className={cn(
              "flex items-start gap-3 rounded-md border p-4 text-small",
              summary.isEmpty
                ? "border-danger/30 bg-danger-bg text-danger"
                : "border-warning/30 bg-warning-bg text-warning",
            )}
          >
            <AlertTriangleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold">{summary.isEmpty ? t("emptyTitle") : t("lowTitle", { pct })}</p>
              <p className="text-fg-2">{summary.isEmpty ? t("emptyBody") : t("lowBody")}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-md border border-border p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-overline text-fg-2">{t("available")}</span>
              <span className="num text-h1 text-fg tabular-nums">{n(summary.available)}</span>
            </div>
            {summary.received > 0 && (
              <span className="text-small text-fg-2">{t("ofReceived", { pct, received: n(summary.received) })}</span>
            )}
          </div>
          {summary.received > 0 && (
            <div className="relative">
              <Progress value={pct} tone={tone} aria-label={t("remainingLabel", { pct })} />
              {/* 25% marker: where the low-balance warning starts. */}
              <span
                aria-hidden
                className="absolute -top-0.5 h-2.5 w-px bg-fg-3"
                style={{ insetInlineStart: `${LOW_BALANCE_RATIO * 100}%` }}
              />
            </div>
          )}
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <Stat label={t("reserved")} value={n(summary.reserved)} hint={t("reservedHint")} />
          <Stat label={t("used")} value={n(summary.used)} hint={t("usedHint")} />
          <Stat label={t("received")} value={n(summary.received)} hint={t("receivedHint")} />
        </dl>

        <ul className="flex flex-col gap-1.5 text-small text-fg-2">
          <li>{t("rules.failed")}</li>
          <li>{t("rules.expire")}</li>
          <li>{t("rules.owner")}</li>
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{t("historyTitle")}</CardTitle>
            <CardDescription>{t("historyDescription")}</CardDescription>
          </div>
        </CardHeader>

        {data.recent_usage.length === 0 ? (
          <EmptyState compact icon={HistoryIcon} title={t("historyEmptyTitle")} description={t("historyEmptyBody")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.action")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.keyword")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-end">{t("columns.credits")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_usage.map((row) => {
                const date = new Date(row.created_at);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-fg-2">
                      {Number.isNaN(date.getTime())
                        ? "—"
                        : format.dateTime(date, { dateStyle: "medium", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="font-medium text-fg">
                      {operationLabel(row.operation)}
                      {row.keyword && (
                        <span className="block text-caption font-normal text-fg-3 md:hidden">{row.keyword}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden max-w-[16rem] truncate text-fg-2 md:table-cell">
                      {row.keyword || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[row.status] ?? "neutral"} shape="pill">
                        {statusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end num font-semibold text-fg tabular-nums">
                      {n(creditsFor(row))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-bg p-3">
      <dt className="text-overline text-fg-2">{label}</dt>
      <dd className="num text-h3 font-semibold text-fg tabular-nums">{value}</dd>
      <dd className="text-caption font-normal text-fg-3">{hint}</dd>
    </div>
  );
}
