import {
  getSessionUserFromCookie,
  mapUserToSession,
  writeSessionUserCookie,
  type SessionUser,
} from "@/lib/auth-session";
import { DEMO_LOGIN_RESPONSE, DEMO_LOGIN_USER } from "@/lib/demo-login";
import type { PlanName } from "@/lib/plan-core";
import type { AllUserSubscriptionsNew } from "@/types/shared";

/**
 * The account the faked sign-in writes into the `authUser` cookie while the
 * app runs without a backend. It is mapped from the real login response in
 * lib/demo-login.ts, exactly as a live sign-in would be. The demo controls on
 * Settings → Profile switch its role, plan and add-ons so every gate can be
 * checked by hand; the defaults reproduce the login response as is.
 */
export type DemoAccountOptions = {
  role: "user" | "admin";
  plan: PlanName;
  billing: "monthly" | "yearly" | "lifetime";
  whiteLabel: boolean;
  removeBranding: boolean;
  cancelled: boolean;
};

export const DEMO_TOKEN = DEMO_LOGIN_RESPONSE.data.token;
export const DEMO_USER_ID = DEMO_LOGIN_USER.id;

export function buildDemoSubscriptions(options: DemoAccountOptions): AllUserSubscriptionsNew {
  const source = DEMO_LOGIN_USER.subscriptions;
  const sourceAddons = source.addons && !Array.isArray(source.addons) ? source.addons : {};
  const addons: Record<string, unknown> = {};
  if (options.removeBranding) addons.remove_branding = sourceAddons.remove_branding;
  if (options.whiteLabel) addons.reseller_seats = sourceAddons.reseller_seats;
  const hasAddons = Object.keys(addons).length > 0;

  if (options.plan === "free" || !source.subscription) {
    return { plan: "free", addons: hasAddons ? addons : [] };
  }

  const lifetime = options.billing === "lifetime";
  const renewsAt = options.billing === "yearly" ? "2027-05-27T10:51:37.000000Z" : "2026-10-27T10:51:37.000000Z";
  return {
    subscription: {
      ...source.subscription,
      name: options.plan,
      type: options.billing,
      // Lifetime plans come back with no platform or dates; recurring ones are billed through Paddle.
      platform: lifetime ? null : "paddle",
      start_date: lifetime ? null : DEMO_LOGIN_USER.created_at,
      end_date: lifetime ? null : renewsAt,
      next_billed_at: lifetime || options.cancelled ? null : renewsAt,
      is_cancelled: !lifetime && options.cancelled,
    },
    addons: hasAddons ? addons : [],
  };
}

export function buildDemoSessionUser(options: DemoAccountOptions = DEFAULT_DEMO_ACCOUNT): SessionUser {
  return mapUserToSession({ ...DEMO_LOGIN_USER, role: options.role, subscriptions: buildDemoSubscriptions(options) });
}

/** Reads the demo controls back out of a session, so the switcher shows what's applied. */
export function readDemoAccount(session: Pick<SessionUser, "role" | "subscriptions"> | null): DemoAccountOptions {
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
    cancelled: Boolean(subscription?.is_cancelled),
  };
}

/** Admin, Enterprise (`reseller`) lifetime, both add-ons: what the login response says. */
export const DEFAULT_DEMO_ACCOUNT: DemoAccountOptions = readDemoAccount(DEMO_LOGIN_USER);

// Versioned so a choice saved against the old demo account doesn't override the login response.
const DEMO_ACCOUNT_STORAGE_KEY = "orbit:demo-account:v2";

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

/**
 * Demo mode only. A browser still holding a cookie from an older demo account
 * (a different user id) is moved onto the current one, keeping any saved
 * demo choice, so nobody has to sign out to see the fixture change.
 */
export function refreshStaleDemoSession() {
  const session = getSessionUserFromCookie();
  if (session && session.id !== DEMO_USER_ID) {
    writeSessionUserCookie(buildDemoSessionUser(loadDemoAccount() ?? DEFAULT_DEMO_ACCOUNT));
  }
}
