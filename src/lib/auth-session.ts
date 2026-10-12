import { deleteClientCookie, readClientCookie, setClientCookie } from "@/lib/cookies";
import type { AllUserSubscriptionsNew, User } from "@/types/types";

/**
 * Session cookies shared with every Netsach product: `authToken` (bearer token
 * for the API) and `authUser` (the trimmed user the UI gates on). Ported from
 * the Flowcasta handoff; only the cookie helpers and event prefix changed, and
 * the product-tour reset was dropped (Rankoya has no tours). proxy.ts reads both
 * cookies on the server.
 */
export const AUTH_TOKEN_COOKIE_NAME = "authToken";
export const AUTH_USER_COOKIE_NAME = "authUser";
const MAX_COOKIE_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// read cookie value
export const readCookieValue = (cookieName: string): string | undefined => readClientCookie(cookieName);

// set auth cookie
export const setAuthTokenCookie = (tokenValue: string) => {
  setClientCookie(AUTH_TOKEN_COOKIE_NAME, tokenValue, MAX_COOKIE_AGE);
};

// get auth cookie
export const getAuthTokenCookie = (): string | undefined => {
  return readCookieValue(AUTH_TOKEN_COOKIE_NAME);
};

// Session User Type
export type SessionUser = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  date_joined: string;
  last_updated_at: string;
  no_of_workspaces: number;
  active_workspace_id: number;
  active_workspace_name: string;
  subscriptions: AllUserSubscriptionsNew;
  tour_completed?: boolean;
};

export interface RegistrationUserState {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
}

// Split a full name into first/last for the session shape. Everything after the
// first token becomes the last name; a single token leaves last name empty.
const splitFullName = (fullName: string): { first: string; last: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first: "", last: "" };
  }
  const [first, ...rest] = parts;
  return { first, last: rest.join(" ") };
};

// session helpers
export const mapUserToSession = (user: User): SessionUser => {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.name,
    email: user.email,
    role: user.role,
    date_joined: user.created_at,
    last_updated_at: user.updated_at,
    no_of_workspaces: user.all_user_workspaces?.length ?? 0,
    active_workspace_id: user.active_workspace?.id ?? 0,
    active_workspace_name: user.active_workspace?.name ?? "",
    subscriptions: user.subscriptions,
    tour_completed: user.tour_completed ?? false,
  };
};

// Build a session from the trimmed user returned by POST /register. Workspace
// and subscription fields fall back to "fresh account" defaults until the full
// profile is fetched.
export const mapRegistrationUserToSession = (user: RegistrationUserState): SessionUser => {
  const { first, last } = splitFullName(user.name);
  return {
    id: user.id,
    firstName: first,
    lastName: last,
    fullName: user.name,
    email: user.email,
    role: "user",
    date_joined: user.created_at,
    last_updated_at: user.created_at,
    no_of_workspaces: 0,
    active_workspace_id: 0,
    active_workspace_name: "",
    subscriptions: { plan: "free", addons: [] },
  };
};

// Fired whenever the session cookie is (re)written, so live UI such as the
// sidebar plan card can re-read it without a full reload.
export const SESSION_UPDATED_EVENT = "rankoya:session-updated";

// Persist an already-mapped session user to the cookie and notify listeners.
export const writeSessionUserCookie = (sessionUser: SessionUser) => {
  setClientCookie(AUTH_USER_COOKIE_NAME, JSON.stringify(sessionUser), MAX_COOKIE_AGE);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }

  return sessionUser;
};

// Set Session User as token
export const setSessionUserCookie = (user: User) => {
  return writeSessionUserCookie(mapUserToSession(user));
};

// get session user from cookie
export const getSessionUserFromCookie = (): SessionUser | null => {
  const cookieValue = readCookieValue(AUTH_USER_COOKIE_NAME);
  if (!cookieValue) {
    return null;
  }
  try {
    return JSON.parse(cookieValue) as SessionUser;
  } catch {
    return null;
  }
};

// initialize session
export const initializeSession = (user: User, token: string): SessionUser => {
  setAuthTokenCookie(token);
  return setSessionUserCookie(user);
};

// initialize session straight from the register response, which returns a
// trimmed user rather than the full profile.
export const initializeSessionFromRegistration = (user: RegistrationUserState, token: string): SessionUser => {
  setAuthTokenCookie(token);
  return writeSessionUserCookie(mapRegistrationUserToSession(user));
};

// clear auth & session cookies
export const clearSession = () => {
  deleteClientCookie(AUTH_TOKEN_COOKIE_NAME);
  deleteClientCookie(AUTH_USER_COOKIE_NAME);
};
