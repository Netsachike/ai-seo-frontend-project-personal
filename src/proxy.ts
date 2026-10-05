import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, LOCALE_HEADER, matchAcceptLanguage } from "@/i18n/config";
import { GUEST_ONLY_PATHS, PUBLIC_PATHS, SESSION_COOKIE } from "@/lib/auth/session";

const matches = (pathname: string, paths: readonly string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Sends signed-out visitors to /sign-in (and signed-in ones away from it), and
 * resolves the UI language from Accept-Language when there is no cookie yet.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);

  if (!signedIn && !matches(pathname, PUBLIC_PATHS)) {
    const url = new URL("/sign-in", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (signedIn && matches(pathname, GUEST_ONLY_PATHS)) {
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
  // Skip Next internals, the MSW worker, the dev gallery and any file with an extension.
  matcher: ["/((?!_next/|dev(?:/|$)|mockServiceWorker\\.js|.*\\.[a-zA-Z0-9]+$).*)"],
};
