"use client";

import * as React from "react";

import {
  AUTH_USER_COOKIE_NAME,
  SESSION_UPDATED_EVENT,
  getSessionUserFromCookie,
  type SessionUser,
} from "@/lib/auth-session";
import { readClientCookie } from "@/lib/cookies";

/**
 * The `authUser` session cookie as React state. It is `undefined` during the
 * server render and hydration (the cookie is read in the browser only), then
 * `SessionUser | null`. Re-reads whenever the cookie is rewritten.
 *
 * The shared pages read the cookie once on mount; this hook keeps that
 * behaviour but avoids a hydration mismatch and lets the demo controls apply
 * without a reload.
 */
let cachedRaw: string | undefined;
let cachedUser: SessionUser | null = null;

function snapshot(): SessionUser | null {
  const raw = readClientCookie(AUTH_USER_COOKIE_NAME);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = getSessionUserFromCookie();
  }
  return cachedUser;
}

function subscribe(onChange: () => void) {
  window.addEventListener(SESSION_UPDATED_EVENT, onChange);
  return () => window.removeEventListener(SESSION_UPDATED_EVENT, onChange);
}

export function useSessionUser(): SessionUser | null | undefined {
  return React.useSyncExternalStore<SessionUser | null | undefined>(subscribe, snapshot, () => undefined);
}
