import type { components } from "./schema";

type S = components["schemas"];

export type Engine = S["Engine"];
export type Range = S["Range"];
export type Role = S["Role"];
export type PlanTier = S["PlanTier"];
export type Me = S["Me"];
export type Plan = S["Plan"];
export type Workspace = S["Workspace"];
export type Brand = S["Brand"];
export type Usage = S["Usage"];
export type UsageMeter = S["UsageMeter"];
export type Delta = S["Delta"];
export type DeltaUnit = Delta["unit"];
export type EngineScore = S["EngineScore"];
export type BrandSeries = S["BrandSeries"];
export type Kpi = S["Kpi"];
export type BrandSummary = S["BrandSummary"];
export type Job = S["Job"];
export type JobStep = S["JobStep"];
export type Notification = S["Notification"];
export type Approval = S["Approval"];
export type TaskRef = S["TaskRef"];
export type AgentMessage = S["AgentMessage"];
export type AgentThread = S["AgentThread"];

export const engines = ["chatgpt", "gemini", "perplexity", "claude", "aio"] as const satisfies readonly Engine[];
export const ranges = ["7d", "30d", "90d", "custom"] as const satisfies readonly Range[];
