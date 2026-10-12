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

/** Open and in-progress Site Guard issues (first page of 50), with the authority readiness score. */
export function useAudit(site: Site | undefined) {
  const id = site?.id ?? 0;
  const issues = useQuery({
    queryKey: siteGuardKeys.issues(id),
    enabled: Boolean(site),
    queryFn: async () => (await siteGuardService.issues(id)).data,
  });
  const authority = useQuery({
    queryKey: authorityKeys.profile(id),
    enabled: Boolean(site),
    queryFn: async () => (await authorityService.profile(id)).profile,
  });

  let data: (AuditData & { raw: SiteGuardIssueWithPage[] }) | undefined;
  if (site && issues.data && authority.data !== undefined) {
    const raw = issues.data.data.filter((issue) => issue.status !== "ignored");
    const open = raw.filter((issue) => issue.status !== "resolved").map(toAuditIssue);
    const pages = new Set(raw.map((issue) => issue.crawl_page_id).filter(Boolean));
    data = {
      domain: site.domain,
      pagesChecked: pages.size,
      checkedAt: site.last_crawled_at ?? raw[0]?.detected_at ?? new Date().toISOString(),
      // No issues and no crawl yet means the audit has not run.
      seoHealth: raw.length === 0 && !site.last_crawled_at ? null : healthOf(open),
      aiReadiness: toNumber(authority.data?.authority_readiness_score),
      // The API has no per-category scores yet.
      categories: [],
      issues: raw.map(toAuditIssue),
      raw,
    };
  }

  return {
    data,
    isPending: !site || issues.isPending || authority.isPending,
    isError: issues.isError || authority.isError,
    refetch: () => Promise.all([issues.refetch(), authority.refetch()]),
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
