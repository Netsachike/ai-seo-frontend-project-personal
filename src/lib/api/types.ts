/**
 * Domain types the UI is built against. Hand-written while the backend is
 * built separately; adjust them to the real API when it lands.
 */

export type Engine = "chatgpt" | "gemini" | "perplexity" | "claude" | "aio";
export type Range = "7d" | "30d" | "90d" | "custom";
export type Role = "owner" | "admin" | "member" | "viewer";
export type ThemePreference = "light" | "dark" | "system";
export type PlanTier = "free" | "growth" | "agency";

export type Me = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  /** UI language */
  locale: string;
  theme: ThemePreference;
  /** IANA zone */
  timezone: string;
  telegram?: { handle?: string; connected?: boolean } | null;
};

export type Plan = {
  id: string;
  /** Display name, e.g. Growth */
  name: string;
  tier: PlanTier;
  /** Hides the Upgrade prompts when true */
  isTopTier: boolean;
};

export type Workspace = {
  id: string;
  name: string;
  role: Role;
  plan: Plan;
  memberCount: number;
  brandCount: number;
  lastBrandSlug?: string | null;
};

export type Brand = {
  id: string;
  /** URL segment for /[brand]/… */
  slug: string;
  name: string;
  domain: string;
  /** Language Orbit writes in. Separate from the user's UI language. */
  contentLanguage: string;
  /** ISO 3166-1 alpha-2 country */
  market: string;
};

export type UsageMeter = { used: number; limit: number };

export type Usage = {
  plan: Plan;
  credits: { remaining: number; total: number };
  breakdown: { scans: UsageMeter; articles: UsageMeter; prompts: UsageMeter };
  renewsAt: string;
};

/** Change versus the previous period of the same length. */
export type Delta = { value: number; unit: "percent" | "points" | "count" | "rank" };
export type DeltaUnit = Delta["unit"];

export type EngineScore = {
  engine: Engine;
  /** 0–1 share of tracked questions; null when the engine was unreachable */
  mentionRate: number | null;
};

export type SeriesPoint = { date: string; value: number | null };

export type BrandSeries = { brandId: string; name: string; isYou: boolean; points: SeriesPoint[] };

export type Kpi = {
  key: "mentionRate" | "avgAiPosition" | "googleTop10" | "aiCitations";
  value: number;
  total?: number | null;
  delta: Delta;
  spark: number[];
};

export type BrandSummary = {
  status: "ready" | "first_scan_running" | "no_data";
  firstScanJobId?: string | null;
  visibility: {
    score: number | null;
    delta: Delta;
    rank: number | null;
    brandCount: number;
    questionCount?: number;
  };
  engines: EngineScore[];
  kpis: Kpi[];
  trend: BrandSeries[];
  shareOfVoice: { brandId: string; name: string; isYou: boolean; share: number; delta: Delta }[];
};

export type JobStep = {
  /** Engine id or step name */
  key: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  retryAt?: string | null;
};

export type Job = {
  id: string;
  type: "scan" | "audit" | "article" | "fix";
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  etaSeconds?: number | null;
  steps: JobStep[];
};

export type Notification = {
  id: string;
  kind: "agent_event" | "approval_waiting" | "scan_finished" | "team_invite";
  createdAt: string;
  read: boolean;
  href: string;
  /** Structured values; the UI owns the copy. */
  params: Record<string, string | number>;
};

export type Approval = {
  id: string;
  title: string;
  status: "pending" | "approved" | "rejected";
  items: string[];
  channels: ("web" | "telegram")[];
};

export type TaskRef = {
  id: string;
  title: string;
  status: "waiting" | "working" | "done" | "failed";
  jobId?: string | null;
  detail?: string | null;
};

export type AgentMessage = {
  id: string;
  role: "user" | "agent";
  createdAt: string;
  source: "web" | "telegram";
  /** Markdown (GFM tables allowed) */
  body: string;
  approval?: Approval | null;
  task?: TaskRef | null;
};

export type AgentThread = { id: string; messages: AgentMessage[] };

export const engines = ["chatgpt", "gemini", "perplexity", "claude", "aio"] as const satisfies readonly Engine[];
export const ranges = ["7d", "30d", "90d", "custom"] as const satisfies readonly Range[];
