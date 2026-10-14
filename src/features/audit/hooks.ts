"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SiteGuardIssue, SiteGuardIssueWithPage, Site } from "@/types/types";
import type { AuditData, AuditIssue, Severity } from "@/lib/mocks/ui-data";
import { authorityKeys, siteGuardKeys } from "@/lib/api/query-keys";
import { toNumber } from "@/services/api/helpers";
import authorityService from "@/services/authority";
import siteGuardService from "@/services/site-guard";

/** Issue types the backend can write a fix for (`propose-fix`): canonical tags and meta descriptions. */
export const isFixableByRankoya = (issue: Pick<SiteGuardIssue, "type">) =>
  /canonical|meta_description/.test(issue.type);

export const severityBadge: Record<Severity, "danger" | "warning" | "neutral"> = {
  critical: "danger",
  warning: "warning",
  notice: "neutral",
};

export function severityOf(priority: string): Severity {
  if (priority === "critical" || priority === "high") return "critical";
  if (priority === "medium") return "warning";
  return "notice";
}

/** Where an issue is in its fix: proposal stored in `metadata.fix`, resolved after live verification. */
export function fixStateOf(issue: SiteGuardIssue): "open" | "proposed" | "fixed" {
  if (issue.status === "resolved") return "fixed";
  if (issue.metadata && typeof issue.metadata === "object" && "fix" in issue.metadata && issue.metadata.fix)
    return "proposed";
  return "open";
}

function pathOf(url: string) {
  try {
    return new URL(url).pathname || url;
  } catch {
    return url;
  }
}

export function toAuditIssue(issue: SiteGuardIssueWithPage): AuditIssue {
  const page = issue.crawl_page?.url ?? null;
  return {
    id: String(issue.id),
    severity: severityOf(issue.priority),
    owner: isFixableByRankoya(issue) ? "rankoya" : "you",
    title: issue.title,
    why: issue.description ?? "",
    pages: page ? 1 : null,
    affected: page ? [pathOf(page)] : [],
    steps: (issue.recommended_action ?? "")
      .split(/\n+|(?<=\.)\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/**
 * Rankoya's SEO health score: 100 less a penalty per open issue by priority.
 * The backend reports issues, not a score.
 */
const PENALTY: Record<Severity, number> = { critical: 8, warning: 3, notice: 1 };
const healthOf = (issues: AuditIssue[]) =>
  Math.max(0, 100 - issues.reduce((sum, issue) => sum + PENALTY[issue.severity], 0));

export const ISSUE_STATUSES = ["open", "in_progress", "resolved", "ignored"] as const;
export type IssueStatusFilter = (typeof ISSUE_STATUSES)[number] | "all";

/** An issue as the audit lists it: the shared shape plus the page, type and fix values. */
export type AuditRow = AuditIssue & {
  type: string;
  status: SiteGuardIssue["status"];
  url: string | null;
  crawlPageId: number | null;
  /** The crawled page the issue was found on, for the page preview. */
  crawlPage: SiteGuardIssueWithPage["crawl_page"];
  currentValue: string | null;
  recommendedValue: string | null;
};

export const toAuditRow = (issue: SiteGuardIssueWithPage): AuditRow => ({
  ...toAuditIssue(issue),
  type: issue.type,
  status: issue.status,
  url: issue.crawl_page?.url ?? null,
  crawlPageId: issue.crawl_page_id,
  crawlPage: issue.crawl_page,
  currentValue: issue.current_value,
  recommendedValue: issue.recommended_value,
});

/** Issues of the same type, with every page they appear on. */
export type IssueGroup = {
  type: string;
  title: string;
  severity: Severity;
  owner: AuditIssue["owner"];
  why: string;
  rows: AuditRow[];
};

export function groupIssues(rows: AuditRow[]): IssueGroup[] {
  const groups = new Map<string, IssueGroup>();
  for (const row of rows) {
    const group = groups.get(row.type);
    if (group) group.rows.push(row);
    else
      groups.set(row.type, {
        type: row.type,
        title: row.title,
        severity: row.severity,
        owner: row.owner,
        why: row.why,
        rows: [row],
      });
  }
  const rank: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };
  return [...groups.values()].sort((a, b) => rank[a.severity] - rank[b.severity] || b.rows.length - a.rows.length);
}

/**
 * The audit summary (first page of every issue, for the health score and the
 * counts), the issues for the chosen status filter and page, and the
 * authority readiness score.
 */
export function useAudit(
  site: Site | undefined,
  { status = "all", page = 1 }: { status?: IssueStatusFilter; page?: number } = {},
) {
  const id = site?.id ?? 0;
  const summary = useQuery({
    queryKey: siteGuardKeys.issues(id),
    enabled: Boolean(site),
    queryFn: async () => (await siteGuardService.issues(id)).data,
  });
  const filters = status === "all" ? {} : { status };
  const list = useQuery({
    queryKey: siteGuardKeys.issues(id, filters, page),
    enabled: Boolean(site),
    queryFn: async () => (await siteGuardService.issues(id, { ...filters, page })).data,
    placeholderData: (previous) => previous,
  });
  const authority = useQuery({
    queryKey: authorityKeys.profile(id),
    enabled: Boolean(site),
    queryFn: async () => (await authorityService.profile(id)).profile,
  });

  let data:
    | (AuditData & {
        raw: SiteGuardIssueWithPage[];
        rows: AuditRow[];
        total: number;
        lastPage: number;
        counts: Record<IssueStatusFilter, number | null>;
      })
    | undefined;
  if (site && summary.data && list.data && authority.data !== undefined) {
    const all = summary.data.data;
    const open = all.filter((issue) => issue.status === "open" || issue.status === "in_progress").map(toAuditIssue);
    const raw = list.data.data;
    data = {
      domain: site.domain,
      pagesChecked: new Set(all.map((issue) => issue.crawl_page_id).filter(Boolean)).size,
      checkedAt: site.last_crawled_at ?? all[0]?.detected_at ?? new Date().toISOString(),
      // No issues and no crawl yet means the audit has not run.
      seoHealth: all.length === 0 && !site.last_crawled_at ? null : healthOf(open),
      aiReadiness: toNumber(authority.data?.authority_readiness_score),
      // The API has no per-category scores yet.
      categories: [],
      issues: raw.map(toAuditIssue),
      raw,
      rows: raw.map(toAuditRow),
      total: list.data.total,
      lastPage: list.data.last_page,
      // Exact only when every issue fits on the summary page.
      counts: Object.fromEntries(
        (["all", ...ISSUE_STATUSES] as const).map((s) => [
          s,
          summary.data.last_page > 1
            ? s === "all"
              ? summary.data.total
              : null
            : s === "all"
              ? all.length
              : all.filter((i) => i.status === s).length,
        ]),
      ) as Record<IssueStatusFilter, number | null>,
    };
  }

  return {
    data,
    isPending: !site || summary.isPending || list.isPending || authority.isPending,
    isFetching: list.isFetching,
    isError: summary.isError || list.isError || authority.isError,
    refetch: () => Promise.all([summary.refetch(), list.refetch(), authority.refetch()]),
  };
}

export function useIssue(siteId: number | undefined, issueId: number) {
  return useQuery({
    queryKey: siteGuardKeys.issue(siteId ?? 0, issueId),
    enabled: Boolean(siteId),
    queryFn: async () => (await siteGuardService.issue(siteId as number, issueId)).data,
  });
}

/** Scans the latest crawl for issues. */
export function useRunAudit(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await siteGuardService.analyze(siteId)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: siteGuardKeys.all(siteId) }),
  });
}

/** Proposes fixes for the given issues, one after another. Nothing is published. */
export function useProposeFixes(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (issueIds: number[]) => {
      const proposals = [];
      for (const issueId of issueIds) proposals.push((await siteGuardService.proposeFix(siteId, issueId)).data);
      return proposals;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: siteGuardKeys.all(siteId) }),
  });
}

export function useApplyFix(siteId: number, issueId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await siteGuardService.applyFix(siteId, issueId)).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: siteGuardKeys.all(siteId) }),
  });
}

export function useVerifyFix(siteId: number, issueId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await siteGuardService.verifyFix(siteId, issueId)).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: siteGuardKeys.all(siteId) }),
  });
}

export function useUpdateIssueStatus(siteId: number, issueId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: "open" | "in_progress" | "ignored") =>
      (await siteGuardService.updateStatus(siteId, issueId, status)).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: siteGuardKeys.all(siteId) }),
  });
}
