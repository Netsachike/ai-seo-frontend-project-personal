"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import { jobKeys } from "./query-keys";

export const JOB_POLL_MS = 3000;

/** Polls GET /jobs/:id every 3 s until the job is done or failed. */
export function useJob(jobId: string | null | undefined) {
  return useQuery({
    queryKey: jobKeys.detail(jobId ?? "none"),
    enabled: Boolean(jobId),
    queryFn: async () => unwrap(await api.GET("/jobs/{jobId}", { params: { path: { jobId: jobId as string } } })),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : JOB_POLL_MS;
    },
    refetchIntervalInBackground: false,
  });
}
