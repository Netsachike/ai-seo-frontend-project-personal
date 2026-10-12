import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, LOCALE_HEADER, matchAcceptLanguage } from "@/i18n/config";
import { GUEST_ONLY_PATHS, LEGAL_PATHS, PUBLIC_PATHS, SESSION_COOKIE } from "@/lib/auth/session";
import { AUTH_USER_COOKIE_NAME } from "@/lib/auth-session";
import { isAdminSession, type PlanAccessSession } from "@/lib/plan-core";

const matches = (pathname: string, paths: readonly string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** /admin and everything under it. */
const ADMIN_PATH = /^\/admin(?:\/|$)/;

/**
 * Whether the session cookie claims the admin role. The cookie is written by
 * the client, so this is navigation UX, not an authorisation boundary: every
 * admin endpoint refuses non-admins on its own.
 */
function sessionIsAdmin(request: NextRequest): boolean {
  const raw = request.cookies.get(AUTH_USER_COOKIE_NAME)?.value;
  if (!raw) return false;
  try {
    return isAdminSession(JSON.parse(raw) as PlanAccessSession);
  } catch {
    // An unreadable cookie is treated as no access rather than full access.
    return false;
  }
}

/**
 * Whether the request arrived on Rankoya's own host rather than a reseller's
 * custom domain. Local development and preview deploys count as the vendor
 * host. Mirrors `isDefaultAppHost` in config/brand.ts, inlined to keep the
 * proxy bundle small.
 */
function isVendorHost(request: NextRequest): boolean {
  const rawHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const host = rawHost.trim().toLowerCase().split(":")[0];
  const appHost = (process.env.NEXT_PUBLIC_APP_HOST ?? "app.rankoya.uk")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
  return (
    host === appHost ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".vercel.app")
  );
}

/**
 * Sends signed-out visitors to /sign-in (and signed-in ones away from it),
 * keeps /admin to admins, hides Rankoya's own legal pages on tenant domains, and
 * resolves the UI language from Accept-Language when there is no cookie yet.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);

  // Rankoya's legal documents. A reseller's customers have no relationship with
  // us, so on a white-label domain these URLs must not resolve at all.
  if (matches(pathname, LEGAL_PATHS) && !isVendorHost(request)) {
    return NextResponse.rewrite(new URL("/_vendor-only", request.url));
  }

  if (!signedIn && !matches(pathname, PUBLIC_PATHS)) {
    const url = new URL("/sign-in", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (signedIn && matches(pathname, GUEST_ONLY_PATHS)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // After the auth redirects, so a signed-out visitor still lands on /sign-in.
  if (ADMIN_PATH.test(pathname) && !sessionIsAdmin(request)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const headers = new Headers(request.headers);
  if (!request.cookies.has(LOCALE_COOKIE)) {
    const locale = matchAcceptLanguage(request.headers.get("accept-language"));
    if (locale) headers.set(LOCALE_HEADER, locale);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip API routes, Next internals, the dev gallery and any file with an extension.
  matcher: ["/((?!api/|_next/|dev(?:/|$)|.*\\.[a-zA-Z0-9]+$).*)"],
};
