import { Building2Icon, SparklesIcon, StoreIcon, ZapIcon, type LucideIcon } from "lucide-react";

// Plan derivation lives in plan-core so the proxy can share it without
// dragging this module's icon imports into its bundle.
export {
  canUseAgencyResources,
  canUseResellerConsole,
  getActivePlan,
  isAdminSession,
  normalizePlan,
  PLAN_NAMES,
  type PlanAccessSession,
  type PlanName,
} from "./plan-core";

import type { PlanName } from "./plan-core";

type BadgeVariant = "neutral" | "ink" | "signal" | "blue" | "success" | "warning" | "danger" | "outline";

/**
 * Presentational metadata per plan. Labels live in messages under
 * `account.plans.<plan>` (label, short, pitch); `reseller` is the internal key
 * for the plan users see as Enterprise.
 */
export type PlanMeta = {
  badgeVariant: BadgeVariant;
  icon: LucideIcon;
  /** Where the plan's upsell prompt sends people. */
  upsellHref: string;
};

export const PLAN_META: Record<PlanName, PlanMeta> = {
  free: { badgeVariant: "neutral", icon: SparklesIcon, upsellHref: "/upgrade" },
  professional: { badgeVariant: "blue", icon: ZapIcon, upsellHref: "/upgrade" },
  agency: { badgeVariant: "success", icon: Building2Icon, upsellHref: "/upgrade" },
  reseller: { badgeVariant: "signal", icon: StoreIcon, upsellHref: "/settings?tab=subscriptions" },
};

/**
 * Hard cap for uploads streamed from the user's machine (profile photo, White
 * Label logo, favicon and carousel images).
 */
export const LOCAL_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
