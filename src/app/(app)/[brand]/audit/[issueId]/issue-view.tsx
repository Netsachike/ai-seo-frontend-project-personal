"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ChevronRightIcon, MessageCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useFakeQuery } from "@/lib/fake-query";
import { auditData } from "@/lib/mocks/ui-data";
import { useUiStore } from "@/lib/store/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ApprovalCard } from "@/components/agent/approval-card";
import { ErrorState } from "@/components/brand/error-state";
import { OwnerChip } from "@/components/brand/owner-chip";
import { brandHref } from "@/components/layout/nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { useShell } from "@/components/layout/shell-context";
import { fixedIssues, severityBadge } from "../audit-view";

export function IssueView({ issueId }: { issueId: string }) {
  const t = useTranslations("audit");
  const tIssue = useTranslations("audit.issue");
  const { brand, brandSlug } = useShell();
  const [done, setDone] = React.useState(() => fixedIssues.has(issueId));
  const query = useFakeQuery(["audit", brand?.id], () => auditData(brand?.id ?? "", brand?.domain ?? ""), {
    enabled: Boolean(brand),
  });

  if (!brand || query.isPending) return <PageSkeleton kpis={0} panels={1} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const issue = query.data.issues.find((i) => i.id === issueId);
  if (!issue) notFound();

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

      {issue.owner === "orbit" &&
        (done ? (
          <p className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-small font-medium text-success">
            <CheckIcon className="size-4" />
            {tIssue("fixApproved")}
          </p>
        ) : (
          <ApprovalCard
            approval={{
              id: `apr_fix_${issue.id}`,
              title: issue.title,
              status: "pending",
              items: issue.affected,
              channels: ["web", "telegram"],
            }}
            onDecided={(a) => {
              if (a.status === "approved") {
                fixedIssues.add(issue.id);
                setDone(true);
              }
            }}
          />
        ))}

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
          {issue.pages !== null && issue.pages > issue.affected.length && (
            <p className="text-caption font-normal text-fg-3">
              {tIssue("andMore", { count: issue.pages - issue.affected.length })}
            </p>
          )}
        </Card>
      </div>

      {issue.owner === "you" && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={done}
            onClick={() => {
              fixedIssues.add(issue.id);
              setDone(true);
              toast.success(tIssue("markedDone"));
            }}
          >
            <CheckIcon />
            {done ? tIssue("doneLabel") : tIssue("markDone")}
          </Button>
          <Button
            variant="agent"
            onClick={() => useUiStore.getState().askOrbit(tIssue("helpPrompt", { title: issue.title }))}
          >
            <MessageCircleIcon />
            {tIssue("askHelp")}
          </Button>
        </div>
      )}
    </div>
  );
}
