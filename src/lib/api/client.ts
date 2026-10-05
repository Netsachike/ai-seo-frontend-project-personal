import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "./schema";
import { getActiveWorkspaceId } from "@/lib/store/ui";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.orbit.example/v1";
export const API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * In the browser, requests wait until the MSW worker is registered so the
 * first query never races past the mock layer. Rendering is not blocked.
 */
let mockReady: Promise<void> | null = null;
function whenMocksReady(): Promise<void> {
  if (!API_MOCKING || typeof window === "undefined") return Promise.resolve();
  mockReady ??= import("@/lib/mocks/browser").then((m) => m.startMockWorker());
  return mockReady;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const workspaceHeader: Middleware = {
  onRequest({ request }) {
    const workspaceId = getActiveWorkspaceId();
    if (workspaceId) request.headers.set("X-Workspace-Id", workspaceId);
    return request;
  },
};

export const api = createClient<paths>({
  baseUrl: API_URL,
  credentials: "include",
  fetch: async (request) => {
    await whenMocksReady();
    return globalThis.fetch(request);
  },
});
api.use(workspaceHeader);

/** Unwraps an openapi-fetch result or throws a typed ApiError for React Query. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || result.data === undefined) {
    const problem = (result.error ?? {}) as { code?: string; title?: string };
    throw new ApiError(result.response.status, problem.code ?? "unknown", problem.title ?? result.response.statusText);
  }
  return result.data;
}
