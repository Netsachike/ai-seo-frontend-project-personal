"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Range } from "@/lib/api/types";
import { api, unwrap } from "@/lib/api/client";
import { overviewKeys } from "@/lib/api/query-keys";
import { useJob } from "@/lib/api/use-job";

export function useBrandSummary(workspaceId: string | undefined, brandId: string | undefined, range: Range) {
  return useQuery({
    queryKey: overviewKeys.summary(workspaceId ?? "none", brandId ?? "none", range),
    enabled: Boolean(workspaceId && brandId),
    queryFn: async () =>
      unwrap(
        await api.GET("/brands/{brandId}/summary", {
          params: { path: { brandId: brandId as string }, query: { range } },
        }),
      ),
    placeholderData: (previous) => previous,
  });
}

/**
 * Starts a scan or audit and polls its job. The job mock advances with real
 * time from the first poll, so a fresh id always starts at zero.
 */
export function useJobRunner(prefix: "job_scan" | "job_audit" | "job_fix") {
  const t = useTranslations("insights.jobs");
  const [jobId, setJobId] = React.useState<string | null>(null);
  const job = useJob(jobId);
  const status = job.data?.status;
  const running = Boolean(jobId) && status !== "done" && status !== "failed";

  React.useEffect(() => {
    if (status === "done" || status === "failed") toast.success(t(`${prefix}.done`));
  }, [status, prefix, t]);

  return {
    job: jobId ? job.data : undefined,
    running,
    start: () => {
      setJobId(`${prefix}_${Date.now()}`);
      toast(t(`${prefix}.started`));
    },
    dismiss: () => setJobId(null),
  };
}
