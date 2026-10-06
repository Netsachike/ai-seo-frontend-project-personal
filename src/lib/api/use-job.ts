"use client";

import { useQuery } from "@tanstack/react-query";

import { getMockJob } from "@/lib/mocks/jobs";
import { jobKeys } from "./query-keys";

export const JOB_POLL_MS = 3000;

/** Polls the job every 3 s until it is done or failed. UI mock: reads the local job fixture. */
export function useJob(jobId: string | null | undefined) {
  return useQuery({
    queryKey: jobKeys.detail(jobId ?? "none"),
    enabled: Boolean(jobId),
    queryFn: async () => getMockJob(jobId as string),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : JOB_POLL_MS;
    },
    refetchIntervalInBackground: false,
  });
}
