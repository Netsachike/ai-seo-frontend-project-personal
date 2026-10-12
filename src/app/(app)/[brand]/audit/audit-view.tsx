"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpenIcon, CheckIcon, Loader2Icon, RotateCwIcon, ShieldCheckIcon, WrenchIcon } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useFormatter, useNow, useTranslations } from "next-intl";

import type { Approval } from "@/lib/mocks/types";
import type { AuditIssue, Severity } from "@/lib/mocks/ui-data";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { fixStateOf, useAudit, useProposeFixes, useRunAudit } from "@/features/audit/hooks";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalCard } from "@/components/agent/approval-card";
import { EmptyState } from "@/components/brand/empty-state";
import { ErrorState } from "@/components/brand/error-state";
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

export function AuditView() {
  const t = useTranslations("audit");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { brand } = useShell();
  const [severity, setSeverity] = useQueryState("severity", parseAsStringLiteral(severities).withDefault("all"));
  const query = useAudit(brand);
  const audit = useRunAudit(brand?.id ?? 0);
  const fix = useProposeFixes(brand?.id ?? 0);
  const [approval, setApproval] = React.useState<{ approval: Approval; issueIds: string[] } | null>(null);

  const runAudit = () =>
    audit.mutate(undefined, {
      onSuccess: (result) => toast.success(t("auditDone", { count: result.issues_created })),
      onError: (error) => toast.error(getErrorMessage(error, t("auditFailed"))),
    });

  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={2} />;
  const data = query.data;
  const issues = data?.issues ?? [];
  const stateOf = (id: string) => {
    const raw = data?.raw.find((i) => String(i.id) === id);
    if (fix.isPending && fix.variables?.includes(Number(id))) return "fixing" as const;
    return raw ? fixStateOf(raw) : ("open" as const);
  };
  const rankoyaOpen = issues.filter((i) => i.owner === "rankoya" && stateOf(i.id) === "open");
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
            <Button variant="secondary" onClick={runAudit} loading={audit.isPending}>
              <RotateCwIcon />
              {t("run")}
            </Button>
            {rankoyaOpen.length > 0 && (
              <Button variant="agent" onClick={() => askToFix(rankoyaOpen)}>
                <WrenchIcon />
                {t("fixAll", { count: rankoyaOpen.length })}
              </Button>
            )}
          </>
        }
      />

      {query.isError && <ErrorState onRetry={() => query.refetch()} />}
      {data && data.seoHealth === null && (
        <EmptyState
          icon={ShieldCheckIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button size="sm" variant="secondary" onClick={runAudit} loading={audit.isPending}>
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
            {data.categories.length > 0 && (
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
            )}
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
                {t("rankoyaCan", { count: issues.filter((i) => i.owner === "rankoya").length })}
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {visible.map((issue) => (
                <IssueRow key={issue.id} issue={issue} state={stateOf(issue.id)} onFix={() => askToFix([issue])} />
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
                  fix.mutate(approval.issueIds.map(Number), {
                    onSuccess: (proposals) => toast.success(t("proposed", { count: proposals.length })),
                    onError: (error) => toast.error(getErrorMessage(error, t("fixFailed"))),
                  });
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
  state: "open" | "fixing" | "proposed" | "fixed";
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
        {issue.owner === "rankoya" ? (
          state === "open" ? (
            <Button size="sm" variant="secondary" onClick={onFix}>
              <WrenchIcon />
              {t("letRankoyaFix")}
            </Button>
          ) : (
            <span
              className={cn("flex items-center gap-1.5 text-small", state === "fixing" ? "text-fg-2" : "text-success")}
            >
              {state === "fixing" ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
              {state === "fixed" ? t("fixed") : state === "proposed" ? t("fixReady") : t("fixing")}
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
