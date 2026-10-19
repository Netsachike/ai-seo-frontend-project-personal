import type { Range } from "@/types/types";

/**
 * One factory per module. Backend data is scoped to the active workspace on
 * the server, and switching workspace clears the whole cache, so site keys
 * start with the site id alone.
 */
export const meKeys = {
  all: ["me"] as const,
};

export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
  usage: (workspaceId: number) => [...workspaceKeys.all, workspaceId, "usage"] as const,
};

export const siteKeys = {
  all: ["sites"] as const,
  list: (workspaceId: number) => [...siteKeys.all, "list", workspaceId] as const,
  detail: (siteId: number) => [...siteKeys.all, siteId] as const,
  /** Everything a site owns sits under its detail key, so one invalidation refreshes a whole site. */
  scope: (siteId: number, module: string, ...rest: unknown[]) => [...siteKeys.detail(siteId), module, ...rest] as const,
};

export const keywordKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "keywords"),
  list: (siteId: number, page = 1) => siteKeys.scope(siteId, "keywords", page),
};

export const topicalMapKeys = {
  list: (siteId: number) => siteKeys.scope(siteId, "topical-maps"),
  detail: (siteId: number, mapId: number) => siteKeys.scope(siteId, "topical-maps", mapId),
};

export const searchConsoleKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "search-console"),
  overview: (siteId: number) => siteKeys.scope(siteId, "search-console", "overview"),
  properties: (siteId: number) => siteKeys.scope(siteId, "search-console", "properties"),
};

export const serpKeys = {
  runs: (siteId: number) => siteKeys.scope(siteId, "serp", "runs"),
  results: (siteId: number, keyword?: string, page = 1) =>
    siteKeys.scope(siteId, "serp", "results", keyword ?? "", page),
  competitors: (siteId: number) => siteKeys.scope(siteId, "competitors"),
  contentGaps: (siteId: number) => siteKeys.scope(siteId, "content-gaps"),
};

export const aiVisibilityKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "ai-visibility"),
  overview: (siteId: number) => siteKeys.scope(siteId, "ai-visibility", "overview"),
  prompts: (siteId: number) => siteKeys.scope(siteId, "ai-visibility", "prompts"),
  results: (siteId: number, page = 1) => siteKeys.scope(siteId, "ai-visibility", "results", page),
};

export const opportunityKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "opportunities"),
  list: (siteId: number, page = 1) => siteKeys.scope(siteId, "opportunities", "list", page),
  detail: (siteId: number, id: number) => siteKeys.scope(siteId, "opportunities", id),
};

export const contentKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "content"),
  calendar: (siteId: number, from: string, to: string) => siteKeys.scope(siteId, "content", "calendar", from, to),
  plans: (siteId: number) => siteKeys.scope(siteId, "content", "plans"),
  articles: (siteId: number, status?: string) => siteKeys.scope(siteId, "content", "articles", status ?? "all"),
  article: (siteId: number, articleId: number) => siteKeys.scope(siteId, "content", "article", articleId),
  research: (siteId: number) => siteKeys.scope(siteId, "content", "research"),
};

export const publishingKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "publishing"),
  connections: (siteId: number) => siteKeys.scope(siteId, "publishing", "connections"),
  publications: (siteId: number, page = 1) => siteKeys.scope(siteId, "publishing", "publications", page),
  /** The newest few pages of publications, scanned for one article's attempts. */
  recent: (siteId: number) => siteKeys.scope(siteId, "publishing", "recent"),
  shopifyBlogs: (siteId: number, connectionId: number) =>
    siteKeys.scope(siteId, "publishing", "shopify-blogs", connectionId),
};

export const siteGuardKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "site-guard"),
  issues: (siteId: number, filters: Record<string, string | undefined> = {}, page = 1) =>
    siteKeys.scope(siteId, "site-guard", "issues", filters, page),
  issue: (siteId: number, issueId: number) => siteKeys.scope(siteId, "site-guard", "issue", issueId),
};

export const crawlKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "crawl"),
  run: (siteId: number, runId: number) => siteKeys.scope(siteId, "crawl", "run", runId),
  pages: (siteId: number, runId: number, page = 1) => siteKeys.scope(siteId, "crawl", "pages", runId, page),
};

export const moneyPageKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "money-pages"),
  list: (siteId: number, page = 1) => siteKeys.scope(siteId, "money-pages", "list", page),
  detail: (siteId: number, id: number) => siteKeys.scope(siteId, "money-pages", id),
  recommendations: (siteId: number, id: number) => siteKeys.scope(siteId, "money-pages", id, "recommendations"),
};

export const authorityKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "authority"),
  profile: (siteId: number) => siteKeys.scope(siteId, "authority", "profile"),
  opportunities: (siteId: number, page = 1) => siteKeys.scope(siteId, "authority", "opportunities", page),
  opportunity: (siteId: number, id: number) => siteKeys.scope(siteId, "authority", "opportunity", id),
  backlinkSummary: (siteId: number) => siteKeys.scope(siteId, "authority", "backlinks", "summary"),
  backlinks: (siteId: number, offset = 0) => siteKeys.scope(siteId, "authority", "backlinks", offset),
};

export const copilotKeys = {
  conversations: (siteId: number) => siteKeys.scope(siteId, "copilot", "conversations"),
  conversation: (siteId: number, conversationId: number) => siteKeys.scope(siteId, "copilot", conversationId),
};

// ── Mock-backed features (no endpoint yet) ───────────────────────────────

export const overviewKeys = {
  all: (siteId: number) => siteKeys.scope(siteId, "overview"),
  summary: (siteId: number, range: Range) => siteKeys.scope(siteId, "overview", "summary", range),
};

export const jobKeys = {
  detail: (jobId: string) => ["jobs", jobId] as const,
};

export const notificationKeys = {
  all: (workspaceId: number) => ["notifications", workspaceId] as const,
};
