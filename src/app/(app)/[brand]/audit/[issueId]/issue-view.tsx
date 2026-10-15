"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ChevronRightIcon, EyeOffIcon, MessageCircleIcon, RadarIcon, TimerIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { FixVerification } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { useUiStore } from "@/lib/store/ui";
import {
  fixStateOf,
  severityBadge,
  toAuditIssue,
  useFixPackage,
  useIssue,
  useUpdateIssueStatus,
  useVerifyFix,
} from "@/features/audit/hooks";
import { PreviewPageButton } from "@/components/crawl/page-inspector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/brand/error-state";
import { OwnerChip } from "@/components/brand/owner-chip";
import { brandHref } from "@/components/layout/nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

export function IssueView({ issueId }: { issueId: string }) {
  const t = useTranslations("audit");
  const tIssue = useTranslations("audit.issue");
  const { brand, brandSlug } = useShell();
  const id = Number(issueId);
  const query = useIssue(brand?.id, id);
  const fix = useFixPackage(brand?.id, query.data);
  const verify = useVerifyFix(brand?.id ?? 0, id);
  const updateStatus = useUpdateIssueStatus(brand?.id ?? 0, id);
  const [verification, setVerification] = React.useState<FixVerification | null>(null);

  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={1} />;
  if (query.isError) {
    if ((query.error as { response?: { status?: number } }).response?.status === 404) notFound();
    return <ErrorState onRetry={() => query.refetch()} />;
  }
  const raw = query.data;
  const issue = toAuditIssue(raw);
  const state = fixStateOf(raw);

  const onError = (fallback: string) => (error: unknown) => toast.error(getErrorMessage(error, fallback));

  return (
    <div className="flex max-w-[880px] flex-col gap-6">
      <header className="flex flex-col gap-4">
        <nav aria-label={tIssue("breadcrumb")} className="flex items-center gap-1.5 text-small text-fg-2">
          <Link href={brandHref(brandSlug, "audit")} className="hover:text-fg hover:underline">
            {t("title")}
          </Link>
          <ChevronRightIcon aria-hidden className="size-3.5 text-fg-3 rtl:-scale-x-100" />
          <span aria-current="page">{tIssue("crumb")}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={severityBadge[issue.severity]}>{t(`severity.${issue.severity}`)}</Badge>
          <OwnerChip owner={issue.owner} />
          <span className="num text-caption text-fg-3">
            {issue.pages === null ? t("siteWide") : t("pages", { count: issue.pages })}
          </span>
        </div>
        <h1 className="text-h1 text-fg">{issue.title}</h1>
        <p className="text-body-lg text-fg-2">{issue.why}</p>
      </header>

      {state === "fixed" && (
        <p className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-small font-medium text-success">
          <CheckIcon className="size-4" />
          {tIssue("verified")}
        </p>
      )}

      {issue.owner === "rankoya" && state !== "fixed" && (
        <Card>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{tIssue("proposalTitle")}</CardTitle>
            <p className="text-small text-fg-2">{tIssue("proposalBody")}</p>
          </div>
          {fix.isPending ? (
            <div role="status" className="flex flex-col gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-24" />
              <span className="text-caption font-normal text-fg-3">{tIssue("preparing")}</span>
            </div>
          ) : fix.isError ? (
            <ErrorState compact onRetry={() => fix.refetch()} />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-overline text-fg-3">
                  {tIssue(`field.${fix.data.field}`)}
                  {fix.data.character_count !== null && (
                    <span className="num"> · {tIssue("characters", { count: fix.data.character_count })}</span>
                  )}
                </span>
                <p dir="auto" className="rounded-md bg-surface-2 px-3 py-2 font-mono text-[13px] break-words text-fg">
                  {fix.data.proposed_value}
                </p>
                {raw.current_value && (
                  <p className="text-caption font-normal text-fg-3">
                    {tIssue("currentValue", { value: raw.current_value })}
                  </p>
                )}
              </div>
              {fix.data.instructions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-overline text-fg-3">{tIssue("instructionsTitle")}</span>
                  <ol className="flex list-decimal flex-col gap-1 ps-5 text-small text-fg-2">
                    {fix.data.instructions.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {Object.entries(fix.data.implementation_examples).map(([name, code]) => (
                <div key={name} className="flex flex-col gap-1">
                  <span className="text-overline text-fg-3">{name}</span>
                  <pre dir="ltr" className="overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-[12px] text-fg">
                    {code}
                  </pre>
                </div>
              ))}
              <Button
                variant="primary"
                className="self-start"
                loading={verify.isPending}
                onClick={() =>
                  verify.mutate(undefined, {
                    onSuccess: (result) => {
                      setVerification(result);
                      if (result.verified) toast.success(result.message);
                    },
                    onError: onError(t("fixFailed")),
                  })
                }
              >
                <RadarIcon />
                {tIssue("verify")}
              </Button>
              {verification && !verification.verified && (
                <p role="status" className="rounded-md bg-warning-bg px-3 py-2 text-small text-warning">
                  {verification.message}
                </p>
              )}
            </>
          )}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{tIssue("stepsTitle")}</CardTitle>
          <ol className="flex list-decimal flex-col gap-2 ps-5 text-body text-fg">
            {issue.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardTitle>{tIssue("affectedTitle", { count: issue.affected.length })}</CardTitle>
          <ul className="flex flex-col gap-1.5">
            {issue.affected.map((url) => (
              <li key={url} dir="ltr" className="text-start font-mono text-[13px] text-fg-2">
                {url}
              </li>
            ))}
          </ul>
          {raw.current_value && (
            <p className="text-caption font-normal text-fg-3">{tIssue("currentValue", { value: raw.current_value })}</p>
          )}
          {raw.crawl_page && (
            <div>
              <PreviewPageButton page={raw.crawl_page} label={tIssue("preview")} />
            </div>
          )}
        </Card>
      </div>

      {issue.owner === "you" && state !== "fixed" && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={raw.status === "in_progress"}
            loading={updateStatus.isPending && updateStatus.variables === "in_progress"}
            onClick={() =>
              updateStatus.mutate("in_progress", {
                onSuccess: () => toast.success(tIssue("markedInProgress")),
                onError: onError(t("fixFailed")),
              })
            }
          >
            <TimerIcon />
            {raw.status === "in_progress" ? tIssue("inProgress") : tIssue("markInProgress")}
          </Button>
          <Button
            variant="secondary"
            loading={updateStatus.isPending && updateStatus.variables === "ignored"}
            onClick={() =>
              updateStatus.mutate("ignored", {
                onSuccess: () => toast.success(tIssue("ignored")),
                onError: onError(t("fixFailed")),
              })
            }
          >
            <EyeOffIcon />
            {tIssue("ignore")}
          </Button>
          <Button
            variant="agent"
            onClick={() => useUiStore.getState().askRankoya(tIssue("helpPrompt", { title: issue.title }))}
          >
            <MessageCircleIcon />
            {tIssue("askHelp")}
          </Button>
        </div>
      )}
    </div>
  );
}
