import { setClientCookie } from "@/lib/cookies";

/** proxy.ts only checks that this cookie exists. The real API will set it (httpOnly) on sign-in. */
export const SESSION_COOKIE = "orbit_session";

/** Where every login lands: the full onboarding flow, then the dashboard. */
export const ONBOARDING_START = "/onboarding/brand";

/** Routes that never need a session. */
export const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/verify"] as const;
/** Signed-in users who open these are sent into the app instead. */
export const GUEST_ONLY_PATHS = ["/sign-in", "/sign-up"] as const;

/** UI stage: auth is faked in the browser until the backend exists. */
export function startSession() {
  setClientCookie(SESSION_COOKIE, "mock");
}

export function endSession() {
  setClientCookie(SESSION_COOKIE, "", 0);
}

/** Simulated network wait for faked submits. */
export const fakeRequest = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Only same-origin paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
