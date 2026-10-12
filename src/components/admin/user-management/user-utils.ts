import { isValidAddon, type ValidAddonKey } from "@/lib/subscription";
import { normalizePlan, type PlanName } from "@/lib/plan-core";
import type { AddNewUserFromAdminPayload, AddOns, User } from "@/types/types";

export type AdminPlan = AddNewUserFromAdminPayload["plan"];
export type BillingType = AddNewUserFromAdminPayload["billing_type"];

export const PLAN_OPTIONS: AdminPlan[] = ["free", "professional", "agency", "reseller"];
export const BILLING_OPTIONS: BillingType[] = ["lifetime", "monthly", "yearly"];
export const ADMIN_ROLES = ["member", "reviewer", "support", "admin"] as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getUserDisplayName(user: User): string {
  const fallback = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return user.name || fallback || user.email;
}

export function getUserCreditBalance(user: User): number {
  return Number(user.token_balance ?? user.credit_balance ?? user.tokens ?? 0);
}

/** One row of a user's subscriptions: the base plan, then each real add-on. */
export type SubscriptionDisplay =
  | { key: "plan"; plan: PlanName; billing: string | null; status: boolean }
  | { key: ValidAddonKey; billing: string | null; status: boolean };

/**
 * Reads the subscriptions shape: a `subscription` object on paid accounts (or
 * a `plan` string on free ones), plus an `addons` map. Only real add-ons are
 * shown; legacy package flags are filtered out.
 */
export function getSubscriptions(user: User): SubscriptionDisplay[] {
  if (!isRecord(user.subscriptions)) return [];

  const record = user.subscriptions as Record<string, unknown>;
  const values: SubscriptionDisplay[] = [];

  const subscription = isRecord(record.subscription) ? record.subscription : null;
  const planName =
    subscription && typeof subscription.name === "string" && subscription.name
      ? subscription.name
      : typeof record.plan === "string" && record.plan
        ? record.plan
        : "free";
  const billingType = subscription && typeof subscription.type === "string" ? subscription.type : null;

  values.push({
    key: "plan",
    plan: normalizePlan(planName),
    billing: billingType,
    status: subscription ? Boolean(subscription.status) : false,
  });

  const addons = record.addons;
  if (isRecord(addons)) {
    Object.entries(addons).forEach(([key, value]) => {
      if (!isValidAddon(key) || !isRecord(value)) return;
      values.push({
        key,
        billing: typeof value.type === "string" && value.type ? value.type : null,
        status: Boolean(value.status),
      });
    });
  }

  return values;
}

export type AddonsState = {
  remove_branding: { enabled: boolean; type: BillingType };
  reseller_seats: { enabled: boolean; limit: number };
};

export function createDefaultAddons(): AddonsState {
  return {
    remove_branding: { enabled: false, type: "lifetime" },
    reseller_seats: { enabled: false, limit: 1 },
  };
}

export function buildAddonsPayload(state: AddonsState): AddOns | null {
  const addons: Record<string, unknown> = {};
  if (state.remove_branding.enabled) {
    addons.remove_branding = { status: true, type: state.remove_branding.type };
  }
  if (state.reseller_seats.enabled) {
    addons.reseller_seats = { status: true, limit: state.reseller_seats.limit };
  }
  return Object.keys(addons).length > 0 ? (addons as AddOns) : null;
}

function normalizeBilling(value: unknown): BillingType {
  return value === "monthly" || value === "yearly" ? value : "lifetime";
}

export function readSubscription(user: User): { plan: AdminPlan; billingType: BillingType } {
  const subs: Record<string, unknown> = isRecord(user.subscriptions)
    ? (user.subscriptions as Record<string, unknown>)
    : {};
  const subscription = isRecord(subs.subscription) ? subs.subscription : null;
  return {
    plan: normalizePlan(subscription?.name ?? subs.plan),
    billingType: normalizeBilling(subscription?.type),
  };
}

export function readAddons(user: User): AddonsState {
  const defaults = createDefaultAddons();
  const subs: Record<string, unknown> = isRecord(user.subscriptions)
    ? (user.subscriptions as Record<string, unknown>)
    : {};
  const addons = isRecord(subs.addons) ? subs.addons : {};
  const removeBranding = isRecord(addons.remove_branding) ? addons.remove_branding : null;
  const resellerSeats = isRecord(addons.reseller_seats) ? addons.reseller_seats : null;

  return {
    remove_branding: {
      enabled: Boolean(removeBranding?.status),
      type: normalizeBilling(removeBranding?.type) || defaults.remove_branding.type,
    },
    reseller_seats: {
      enabled: Boolean(resellerSeats?.status),
      limit:
        typeof resellerSeats?.limit === "number" && resellerSeats.limit > 0
          ? resellerSeats.limit
          : defaults.reseller_seats.limit,
    },
  };
}
