"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SiteGuardIssueWithPage } from "@/types/types";
import { crawlKeys, siteGuardKeys, siteKeys } from "@/lib/api/query-keys";
import crawlerService from "@/services/crawler";
import siteGuardService from "@/services/site-guard";
import { useSetupStore } from "@/features/site-setup/store";

/**
 * The API has no "latest crawl run" endpoint, so the newest run id per site is
 * remembered here (from setup, from a recrawl started on this device, or from
 * the crawl pages the audit issues point at).
 */
type CrawlRunState = {
  runs: Record<number, number>;
  setRun: (siteId: number, runId: number) => void;
};

const useCrawlRunStore = create<CrawlRunState>()(
  persist(
    (set) => ({
      runs: {},
      setRun: (siteId, runId) => set((s) => ({ runs: { ...s.runs, [siteId]: Math.max(runId, s.runs[siteId] ?? 0) } })),
    }),
    { name: "rankoya:crawl-runs", storage: createJSONStorage(() => localStorage) },
  ),
);

/** The newest run id known for the site, from any source. */
export function useLatestRunId(siteId: number, issues: SiteGuardIssueWithPage[] = []) {
  const stored = useCrawlRunStore((s) => s.runs[siteId]);
  const fromSetup = useSetupStore((s) => s.drafts[siteId]?.crawlRunId ?? undefined);
  const fromIssues = issues.reduce((max, issue) => Math.max(max, issue.crawl_page?.crawl_run_id ?? 0), 0);
  const latest = Math.max(stored ?? 0, fromSetup ?? 0, fromIssues);
  return latest > 0 ? latest : null;
}

const isActive = (status: string | undefined) => status === "pending" || status === "running";

/** One crawl run, polled every 3 s while it is still going. */
export function useCrawlRun(siteId: number, runId: number | null) {
  return useQuery({
    queryKey: crawlKeys.run(siteId, runId ?? 0),
    enabled: Boolean(siteId && runId),
    queryFn: async () => (await crawlerService.getRun(siteId, runId as number)).data,
    refetchInterval: (query) => (isActive(query.state.data?.status) ? 3000 : false),
  });
}

/** One page (50 rows) of the pages a crawl run fetched. */
export function useCrawlPages(siteId: number, runId: number | null, page: number) {
  return useQuery({
    queryKey: crawlKeys.pages(siteId, runId ?? 0, page),
    enabled: Boolean(siteId && runId),
    queryFn: () => crawlerService.listPages(siteId, runId as number, { page }),
    placeholderData: (previous) => previous,
  });
}

/** Starts a new crawl and remembers its run id; the run query then polls it. */
export function useStartCrawl(siteId: number) {
  const queryClient = useQueryClient();
  const setRun = useCrawlRunStore((s) => s.setRun);
  return useMutation({
    mutationFn: async () => (await crawlerService.start(siteId)).data,
    onSuccess: (run) => {
      setRun(siteId, run.id);
      queryClient.setQueryData(crawlKeys.run(siteId, run.id), run);
    },
  });
}

/** When a crawl finishes: refresh the site and its pages, then scan the new pages for issues. */
export function useFinishCrawl(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await siteGuardService.analyze(siteId)).data,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) }),
        queryClient.invalidateQueries({ queryKey: crawlKeys.all(siteId) }),
        queryClient.invalidateQueries({ queryKey: siteGuardKeys.all(siteId) }),
      ]),
  });
}

export { isActive as isCrawlActive };
