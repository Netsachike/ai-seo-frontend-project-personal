import type { AllUserSubscriptionsNew } from "@/types/types";

/**
 * Plan derivation with no UI imports, so proxy.ts can use it without pulling
 * icons and components into its bundle. `lib/plan.ts` re-exports these for
 * app code alongside the presentational metadata.
 */
export type PlanName = "free" | "professional" | "agency" | "reseller";

export const PLAN_NAMES: readonly PlanName[] = ["free", "professional", "agency", "reseller"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizePlan(value: unknown): PlanName {
  return value === "professional" || value === "agency" || value === "reseller" ? value : "free";
}

/**
 * Derives the user's current plan from the subscriptions shape:
 *   paid:  { subscription: { name, status, ... }, addons }
 *   free:  { plan: "free", addons: [] }
 * A subscription only counts when its `status` is truthy.
 */
export function getActivePlan(subscriptions: AllUserSubscriptionsNew | null | undefined): PlanName {
  if (!isRecord(subscriptions)) {
    return "free";
  }

  const subscription = isRecord(subscriptions.subscription) ? subscriptions.subscription : null;

  if (subscription && subscription.status) {
    return normalizePlan(subscription.name);
  }

  return normalizePlan(subscriptions.plan);
}

/** The subset of the session cookie the gates need. */
export interface PlanAccessSession {
  role?: string;
  subscriptions?: AllUserSubscriptionsNew | null;
}

const isAdminRole = (role: string | undefined) => {
  const value = role?.toLowerCase() || "";
  return value === "admin" || value === "super_admin";
};

/** /admin is for the `admin` role only (exact match, like the proxy). */
export const isAdminSession = (session: PlanAccessSession | null | undefined) => session?.role === "admin";

/** Reseller console: admins, or the Enterprise (`reseller`) plan. */
export function canUseResellerConsole(session: PlanAccessSession | null | undefined): boolean {
  if (!session) return false;
  if (isAdminRole(session.role)) return true;
  return session.subscriptions?.subscription?.name === "reseller";
}

/** Agency resources: admins, or an active `agency` / `reseller` subscription. */
export function canUseAgencyResources(session: PlanAccessSession | null | undefined): boolean {
  if (!session) return false;
  if (isAdminRole(session.role)) return true;
  const subscription = session.subscriptions?.subscription;
  return Boolean(subscription?.status && (subscription.name === "agency" || subscription.name === "reseller"));
}
