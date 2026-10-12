/**
 * Shapes for features that have no backend endpoint yet: the user's UI
 * preferences, usage meters, the overview trend summary, background jobs,
 * notifications, and the agent's approval thread. They exist only for the
 * mock data in this folder; anything the backend serves is typed in
 * src/types/types.ts.
 */
import type { Engine, ThemePreference } from "@/types/types";

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
