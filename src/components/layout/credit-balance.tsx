"use client";

import Link from "next/link";
import { CoinsIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { accountHref } from "@/features/account/routes";
import { useCreditBalance } from "@/features/credits/use-credit-balance";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Remaining credits, always in the topbar (spec: "show the remaining balance
 * on every page"). Amber at 25% of what was received, red at zero. Links to
 * the Credits tab in settings. Hidden when there's no backend or session.
 */
export function CreditBalance({ className }: { className?: string }) {
  const t = useTranslations("shell.credits");
  const format = useFormatter();
  const { enabled, isPending, isError, summary } = useCreditBalance();

  if (!enabled || isError) return null;
  if (isPending || !summary) return <Skeleton className={cn("h-8 w-16 rounded-full", className)} />;

  const tone = summary.isEmpty ? "danger" : summary.isLow ? "warning" : "neutral";
  const amount = format.number(summary.available);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={accountHref.settings("credits")}
          aria-label={t("label", { count: summary.available })}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-small font-semibold tabular-nums transition-colors",
            tone === "neutral" && "border-border bg-surface text-fg hover:bg-surface-2",
            tone === "warning" && "border-warning/40 bg-warning-bg text-warning hover:border-warning",
            tone === "danger" && "border-danger/40 bg-danger-bg text-danger hover:border-danger",
            className,
          )}
        >
          <CoinsIcon aria-hidden className="size-4" />
          {amount}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        {summary.isEmpty
          ? t("empty")
          : summary.isLow
            ? t("low", { count: summary.available })
            : t("label", { count: summary.available })}
      </TooltipContent>
    </Tooltip>
  );
}
