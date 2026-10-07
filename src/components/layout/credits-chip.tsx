"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import type { Usage } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useUsage } from "@/features/workspace/hooks";
import { accountHref } from "@/features/account/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShell } from "./shell-context";

export type CreditsTone = "normal" | "warning" | "danger";

/** Warning under 20% left, danger at zero. Limits always come from the API. */
export function creditsTone(usage: Usage): CreditsTone {
  const { remaining, total } = usage.credits;
  if (remaining <= 0) return "danger";
  if (total > 0 && remaining / total < 0.2) return "warning";
  return "normal";
}

const meterTone: Record<CreditsTone, string> = { normal: "bg-ink", warning: "bg-warning", danger: "bg-danger" };

export function CreditsChip({ className }: { className?: string }) {
  const t = useTranslations("shell.credits");
  const format = useFormatter();
  const { workspace } = useShell();
  const usage = useUsage(workspace?.id);

  if (!usage.data) return <Skeleton className={cn("h-9 w-32", className)} />;

  const { remaining, total } = usage.data.credits;
  const tone = creditsTone(usage.data);
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const amount = format.number(remaining, "integer");
  const totalText = format.number(total, "integer");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={accountHref.settings("subscriptions")}
          aria-label={t("aria", { remaining: amount, total: totalText })}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-small hover:border-border-strong",
            tone === "warning" && "border-transparent bg-warning-bg",
            tone === "danger" && "border-transparent bg-danger-bg",
            className,
          )}
        >
          <span className={cn("text-fg-2", tone === "warning" && "text-warning", tone === "danger" && "text-danger")}>
            {t("label")}
          </span>
          <span className="num font-medium text-fg">{amount}</span>
          <span aria-hidden className="h-1.5 w-8 overflow-hidden rounded-full bg-border">
            <span className={cn("block h-full rounded-full", meterTone[tone])} style={{ width: `${pct * 100}%` }} />
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-60 p-3">
        <div className="flex flex-col gap-2">
          <p className="text-small font-semibold">{t("summary", { remaining: amount, total: totalText })}</p>
          <dl className="flex flex-col gap-1">
            {(["scans", "articles", "prompts"] as const).map((key) => {
              const meter = usage.data.breakdown[key];
              return (
                <div key={key} className="flex items-center justify-between gap-4 text-caption font-normal">
                  <dt>{t(`breakdown.${key}`)}</dt>
                  <dd className="num">{t("meter", { used: meter.used, limit: meter.limit })}</dd>
                </div>
              );
            })}
          </dl>
          <p className="text-caption font-normal opacity-80">
            {t("renews", { date: format.dateTime(new Date(usage.data.renewsAt), "medium") })}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
