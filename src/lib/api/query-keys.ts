import type { Range } from "./types";

/**
 * One factory per module. Every key that depends on workspace data starts
 * with the workspace id, so switching workspace can also be done by scope.
 */
export const meKeys = {
  all: ["me"] as const,
};

export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
  brands: (workspaceId: string) => [...workspaceKeys.all, workspaceId, "brands"] as const,
  usage: (workspaceId: string) => [...workspaceKeys.all, workspaceId, "usage"] as const,
};

export const overviewKeys = {
  all: (workspaceId: string, brandId: string) => ["overview", workspaceId, brandId] as const,
  summary: (workspaceId: string, brandId: string, range: Range) =>
    [...overviewKeys.all(workspaceId, brandId), "summary", range] as const,
};

export const visibilityKeys = {
  all: (workspaceId: string, brandId: string) => ["visibility", workspaceId, brandId] as const,
  byEngine: (workspaceId: string, brandId: string, range: Range) =>
    [...visibilityKeys.all(workspaceId, brandId), "byEngine", range] as const,
  prompts: (workspaceId: string, brandId: string, range: Range, engine?: string) =>
    [...visibilityKeys.all(workspaceId, brandId), "prompts", range, engine ?? "all"] as const,
  prompt: (workspaceId: string, brandId: string, promptId: string) =>
    [...visibilityKeys.all(workspaceId, brandId), "prompt", promptId] as const,
  sources: (workspaceId: string, brandId: string, range: Range) =>
    [...visibilityKeys.all(workspaceId, brandId), "sources", range] as const,
};

export const jobKeys = {
  detail: (jobId: string) => ["jobs", jobId] as const,
};

export const notificationKeys = {
  all: (workspaceId: string) => ["notifications", workspaceId] as const,
};

export const agentKeys = {
  thread: (workspaceId: string, threadId: string) => ["agent", workspaceId, "thread", threadId] as const,
};
