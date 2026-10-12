import { AUTH_TOKEN_COOKIE_NAME, clearSession, initializeSession } from "@/lib/auth-session";
import authService from "@/services/auth";
import type { LoginPayload, RegisterPayload } from "@/types/types";

/**
 * proxy.ts only checks that this cookie exists. It is the shared Netsach
 * `authToken` (see lib/auth-session.ts), set from `POST /login` → `data.token`.
 */
export const SESSION_COOKIE = AUTH_TOKEN_COOKIE_NAME;

/** Where a sign-in lands: the sites page, to pick a site. */
export const SIGNED_IN_HOME = "/sites";
/** Where a new account lands: adding its first site. */
export const NEW_ACCOUNT_START = "/sites/new";

/** Public legal pages: OAuth providers and Paddle review these signed out. */
export const LEGAL_PATHS = ["/privacy-policy", "/terms-of-service", "/refund-policy"] as const;

/** Routes that never need a session. */
export const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/verify", ...LEGAL_PATHS] as const;
/** Signed-in users who open these are sent into the app instead. */
export const GUEST_ONLY_PATHS = ["/sign-in", "/sign-up"] as const;

/** Signs in and writes the `authToken` + `authUser` cookies from the login response. */
export async function signIn(payload: LoginPayload) {
  const { data } = await authService.login(payload);
  return initializeSession(data.user, data.token);
}

/** Creates the account. Register returns the same shape as login, so the user is signed in straight away. */
export async function signUp(payload: RegisterPayload) {
  const { data } = await authService.register(payload);
  return initializeSession(data.user, data.token);
}

/** Revokes the token on the backend (best effort), then clears the cookies. */
export async function endSession() {
  try {
    await authService.logout();
  } catch {
    // The token may already be invalid; signing out locally is what matters.
  }
  clearSession();
}

/** Simulated network wait for flows the backend does not serve yet (password reset, email codes). */
export const fakeRequest = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Only same-origin paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
