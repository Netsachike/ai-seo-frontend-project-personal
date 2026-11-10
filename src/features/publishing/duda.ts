"use client";

/** Duda verify codes that have their own message under `integrations.dudaErrors`. */
export const DUDA_ERRORS = ["duda_auth", "duda_site_not_found", "duda_unavailable"] as const;
export type DudaError = (typeof DUDA_ERRORS)[number];

/**
 * Asks /api/integrations/duda/verify whether the API username and password
 * reach the site. Returns the API host to save on the connection (US or EU),
 * or the error code to show.
 */
export async function verifyDuda(values: Record<string, string>): Promise<{ host: string } | { error: DudaError }> {
  try {
    const res = await fetch("/api/integrations/duda/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: values.username ?? "",
        password: values.password ?? "",
        site_name: values.site_name ?? "",
      }),
    });
    const body = (await res.json().catch(() => null)) as { host?: string; code?: string } | null;
    if (res.ok && body?.host) return { host: body.host };
    const code = body?.code ?? "";
    return { error: (DUDA_ERRORS as readonly string[]).includes(code) ? (code as DudaError) : "duda_unavailable" };
  } catch {
    return { error: "duda_unavailable" };
  }
}
