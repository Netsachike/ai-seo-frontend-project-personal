"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpenIcon, CheckIcon, Loader2Icon, RotateCwIcon, ShieldCheckIcon, WrenchIcon } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useNow, useTranslations } from "next-intl";

import type { Approval } from "@/lib/api/types";
import { useFakeQuery } from "@/lib/fake-query";
import { auditData, type AuditIssue, type Severity } from "@/lib/mocks/ui-data";
import { cn } from "@/lib/utils";
import { useJobRunner } from "@/features/insights/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalCard } from "@/components/agent/approval-card";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
import { JobBanner } from "@/components/brand/job-banner";
import { OwnerChip } from "@/components/brand/owner-chip";
import { ScoreRing, scoreBand } from "@/components/brand/score-ring";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";

const severities = ["all", "critical", "warning", "notice"] as const;
const bandBar = { danger: "bg-danger", warning: "bg-warning", success: "bg-success" } as const;
export const severityBadge: Record<Severity, "danger" | "warning" | "neutral"> = {
  critical: "danger",
  warning: "warning",
  notice: "neutral",
};

/** Fixes in flight or done, shared with the issue detail page for this session. */
export const fixedIssues = new Set<string>();

export function AuditView() {
  const t = useTranslations("audit");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { brand } = useShell();
  const [severity, setSeverity] = useQueryState("severity", parseAsStringLiteral(severities).withDefault("all"));
  const audit = useJobRunner("job_audit");
  const fix = useJobRunner("job_fix");
  const [fixing, setFixing] = React.useState<string[]>(() => [...fixedIssues]);
  const [approval, setApproval] = React.useState<{ approval: Approval; issueIds: string[] } | null>(null);
  const query = useFakeQuery(["audit", brand?.id], () => auditData(brand?.id ?? "", brand?.domain ?? ""), {
    enabled: Boolean(brand),
  });

  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={2} />;
  const data = query.data;
  const issues = data?.issues ?? [];
  const orbitOpen = issues.filter((i) => i.owner === "orbit" && !fixing.includes(i.id));
  const visible = issues.filter((i) => severity === "all" || i.severity === severity);
  const count = (s: (typeof severities)[number]) => issues.filter((i) => s === "all" || i.severity === s).length;

  const askToFix = (list: AuditIssue[]) =>
    setApproval({
      issueIds: list.map((i) => i.id),
      approval: {
        id: `apr_fix_${list.map((i) => i.id).join("_")}`,
        title: list.length === 1 ? list[0].title : t("fixAllTitle", { count: list.length }),
        status: "pending",
        items: list.map((i) => (i.pages ? t("fixItem", { title: i.title, pages: i.pages }) : i.title)),
        channels: ["web", "telegram"],
      },
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={
          data && data.seoHealth !== null
            ? t("description", {
                domain: data.domain,
                pages: data.pagesChecked,
                when: format.relativeTime(new Date(data.checkedAt), now),
              })
            : t("descriptionEmpty", { domain: brand.domain })
        }
        actions={
          <>
            <Button variant="secondary" onClick={audit.start} disabled={audit.running}>
              <RotateCwIcon />
              {t("run")}
            </Button>
            {orbitOpen.length > 0 && (
              <Button variant="agent" onClick={() => askToFix(orbitOpen)}>
                <WrenchIcon />
                {t("fixAll", { count: orbitOpen.length })}
              </Button>
            )}
          </>
        }
      />

      {audit.job && <JobBanner job={audit.job} title={t("auditRunning")} onDismiss={audit.dismiss} />}
      {fix.job && <JobBanner job={fix.job} title={t("fixRunning")} onDismiss={fix.dismiss} />}

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}
      {data && data.seoHealth === null && (
        <EmptyState
          icon={ShieldCheckIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button size="sm" variant="secondary" onClick={audit.start} disabled={audit.running}>
              {t("run")}
            </Button>
          }
        />
      )}

      {data && data.seoHealth !== null && (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
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
            <Card>
              <CardTitle>{t("categoriesTitle")}</CardTitle>
              <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                {data.categories.map((c) => (
                  <li key={c.key} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-small font-medium text-fg">{t(`categories.${c.key}`)}</span>
                      <span className="num text-small text-fg">{c.score}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={cn("h-full rounded-full", bandBar[scoreBand(c.score)])}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <span className="text-caption font-normal text-fg-3">{c.note}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="gap-0 p-0">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
              <Tabs value={severity} onValueChange={(v) => void setSeverity(v as (typeof severities)[number])}>
                <TabsList aria-label={t("severityLabel")}>
                  {severities.map((s) => (
                    <TabsTrigger key={s} value={s}>
                      {t(`tabs.${s}`, { count: count(s) })}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <p className="text-small text-fg-2">
                {t("orbitCan", { count: issues.filter((i) => i.owner === "orbit").length })}
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {visible.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  state={fixing.includes(issue.id) ? (fix.running ? "fixing" : "fixed") : "open"}
                  onFix={() => askToFix([issue])}
                />
              ))}
            </ul>
          </Card>
        </>
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
                  approval.issueIds.forEach((id) => fixedIssues.add(id));
                  setFixing((f) => [...new Set([...f, ...approval.issueIds])]);
                  fix.start();
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

function IssueRow({
  issue,
  state,
  onFix,
}: {
  issue: AuditIssue;
  state: "open" | "fixing" | "fixed";
  onFix: () => void;
}) {
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
        <span className="num text-caption text-fg-3">
          {issue.pages === null ? t("siteWide") : t("pages", { count: issue.pages })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <OwnerChip owner={issue.owner} />
        {issue.owner === "orbit" ? (
          state === "open" ? (
            <Button size="sm" variant="secondary" onClick={onFix}>
              <WrenchIcon />
              {t("letOrbitFix")}
            </Button>
          ) : (
            <span
              className={cn("flex items-center gap-1.5 text-small", state === "fixed" ? "text-success" : "text-fg-2")}
            >
              {state === "fixed" ? <CheckIcon className="size-4" /> : <Loader2Icon className="size-4 animate-spin" />}
              {state === "fixed" ? t("fixed") : t("fixing")}
            </span>
          )
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
