import { cookies } from "next/headers";

import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth-session";
import { IntegrationError } from "./errors";

/** Laravel's base URL including `/api`, as seen from the server. */
function backendUrl(): string {
  const base = (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!base) throw new IntegrationError("backend_not_configured", 500);
  return base.replace(/\/+$/, "");
}

/**
 * Calls Laravel as the signed-in user, forwarding the `authToken` cookie the
 * same way axios does in the browser. The backend still resolves the
 * workspace from the token, so a user can't touch a site outside it.
 */
export async function backend<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_NAME)?.value;
  if (!token) throw new IntegrationError("unauthenticated", 401);
  const res = await fetch(`${backendUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${decodeURIComponent(token)}`,
      ...init.headers,
    },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new IntegrationError(body?.message ?? `backend_${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Calls Laravel as Rankoya itself, for public routes with no signed-in user
 * (the RSS / JSON feeds). Needs `BACKEND_SERVICE_TOKEN`, issued by the backend
 * team for `GET /internal/sites/{site}/feed`. Sent both ways the brief allows:
 * the shared-secret header and a Sanctum bearer token.
 */
export async function serviceBackend<T>(path: string): Promise<T> {
  const token = process.env.BACKEND_SERVICE_TOKEN?.trim();
  if (!token) throw new IntegrationError("service_token_missing", 503);
  const res = await fetch(`${backendUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "X-Internal-Token": token },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new IntegrationError(`backend_${res.status}`, res.status === 404 ? 404 : 502);
  return (await res.json()) as T;
}
