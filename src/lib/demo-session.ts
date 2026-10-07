import type { SessionUser } from "@/lib/auth-session";
import type { PlanName } from "@/lib/plan-core";
import type { AllUserSubscriptionsNew } from "@/types/shared";

/**
 * The account the faked sign-in writes into the `authUser` cookie while the
 * app runs without a backend. The demo controls on Settings → Profile switch
 * its role, plan and add-ons so every gate can be checked by hand.
 */
export type DemoAccountOptions = {
  role: "user" | "admin";
  plan: PlanName;
  billing: "monthly" | "yearly" | "lifetime";
  whiteLabel: boolean;
  removeBranding: boolean;
  cancelled: boolean;
};

export const DEFAULT_DEMO_ACCOUNT: DemoAccountOptions = {
  role: "user",
  plan: "agency",
  billing: "yearly",
  whiteLabel: true,
  removeBranding: false,
  cancelled: false,
};

export const DEMO_TOKEN = "demo-token";
export const DEMO_USER_ID = 1;

export function buildDemoSubscriptions(options: DemoAccountOptions): AllUserSubscriptionsNew {
  const addons: Record<string, unknown> = {};
  if (options.removeBranding) {
    addons.remove_branding = { id: 31, status: true, type: "lifetime", start_date: "2026-03-02", end_data: null };
  }
  if (options.whiteLabel) addons.reseller_seats = { status: true, limit: 100 };
  const hasAddons = Object.keys(addons).length > 0;

  if (options.plan === "free") {
    return { plan: "free", addons: hasAddons ? addons : [] };
  }
  return {
    subscription: {
      id: 1207,
      name: options.plan,
      status: true,
      platform: "paddle",
      type: options.billing,
      start_date: "2026-03-14T10:00:00Z",
      end_date: options.billing === "yearly" ? "2027-03-14T10:00:00Z" : "2026-11-14T10:00:00Z",
      is_cancelled: options.cancelled ? 1 : 0,
    },
    addons: hasAddons ? addons : [],
  };
}

export function buildDemoSessionUser(options: DemoAccountOptions = DEFAULT_DEMO_ACCOUNT): SessionUser {
  return {
    id: DEMO_USER_ID,
    firstName: "Favour",
    lastName: "Odili",
    fullName: "Favour Odili",
    email: "favourto91@gmail.com",
    role: options.role,
    date_joined: "2026-03-14T10:00:00Z",
    last_updated_at: "2026-10-01T09:00:00Z",
    no_of_workspaces: 2,
    active_workspace_id: 1,
    active_workspace_name: "Northwind Team",
    subscriptions: buildDemoSubscriptions(options),
    tour_completed: true,
  };
}

const DEMO_ACCOUNT_STORAGE_KEY = "orbit:demo-account";

/** The last demo choice, kept per browser so signing out and back in keeps it. */
export function loadDemoAccount(): DemoAccountOptions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_ACCOUNT_STORAGE_KEY);
    return raw ? { ...DEFAULT_DEMO_ACCOUNT, ...(JSON.parse(raw) as Partial<DemoAccountOptions>) } : null;
  } catch {
    return null;
  }
}

export function saveDemoAccount(options: DemoAccountOptions) {
  try {
    window.localStorage.setItem(DEMO_ACCOUNT_STORAGE_KEY, JSON.stringify(options));
  } catch {
    // Storage blocked: the choice still applies to this session's cookie.
  }
}

/** Reads the demo controls back out of a session, so the switcher shows what's applied. */
export function readDemoAccount(session: SessionUser | null): DemoAccountOptions {
  if (!session) return DEFAULT_DEMO_ACCOUNT;
  const subs = session.subscriptions;
  const addons = subs?.addons && !Array.isArray(subs.addons) ? subs.addons : {};
  const subscription = subs?.subscription;
  return {
    role: session.role === "admin" ? "admin" : "user",
    plan: subscription?.status ? subscription.name : "free",
    billing: subscription?.type ?? "yearly",
    whiteLabel: Boolean(addons.reseller_seats?.status),
    removeBranding: Boolean(addons.remove_branding?.status),
    cancelled: subscription?.is_cancelled === 1,
  };
}
