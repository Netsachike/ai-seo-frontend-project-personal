import {
  AUTH_TOKEN_COOKIE_NAME,
  clearSession,
  getSessionUserFromCookie,
  setAuthTokenCookie,
  writeSessionUserCookie,
} from "@/lib/auth-session";
import { DEMO_TOKEN, buildDemoSessionUser, loadDemoAccount, readDemoAccount } from "@/lib/demo-session";

/**
 * proxy.ts only checks that this cookie exists. It is the shared Netsach
 * `authToken` (see lib/auth-session.ts); the real API sets it on sign-in.
 */
export const SESSION_COOKIE = AUTH_TOKEN_COOKIE_NAME;

/** Where every login lands: the full onboarding flow, then the dashboard. */
export const ONBOARDING_START = "/onboarding/brand";

/** Public legal pages: OAuth providers and Paddle review these signed out. */
export const LEGAL_PATHS = ["/privacy-policy", "/terms-of-service", "/refund-policy"] as const;

/** Routes that never need a session. */
export const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/verify", ...LEGAL_PATHS] as const;
/** Signed-in users who open these are sent into the app instead. */
export const GUEST_ONLY_PATHS = ["/sign-in", "/sign-up"] as const;

/**
 * UI stage: sign-in is faked in the browser until the auth endpoints are
 * wired. It writes the same two cookies the real login does, with a demo
 * account whose role and plan can be switched in Settings → Profile. A
 * previous demo choice survives signing out and back in.
 */
export function startSession() {
  setAuthTokenCookie(DEMO_TOKEN);
  writeSessionUserCookie(buildDemoSessionUser(loadDemoAccount() ?? readDemoAccount(getSessionUserFromCookie())));
}

export function endSession() {
  clearSession();
}

/** Simulated network wait for faked submits. */
export const fakeRequest = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Only same-origin paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
