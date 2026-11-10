/**
 * Where the app is reachable from the outside (OAuth providers redirect here).
 * `APP_URL` wins; otherwise the request's own origin, which is right on
 * localhost and Vercel previews.
 */
export function appUrl(requestUrl: string): string {
  return (process.env.APP_URL?.trim() || new URL(requestUrl).origin).replace(/\/+$/, "");
}

/**
 * Only a same-site relative path, so a callback can never become an open
 * redirect: one leading slash, no `//host`, no backslash tricks.
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/sites"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/** Adds query params to a relative path, keeping any it already has. */
export function withParams(path: string, params: Record<string, string>): string {
  const url = new URL(path, "http://x");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}
