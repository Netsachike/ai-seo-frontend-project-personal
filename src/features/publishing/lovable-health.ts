"use client";

/** Lovable health-check codes that have their own message under `integrations.lovable.errors`. */
export const LOVABLE_ERRORS = [
  "lovable_url",
  "lovable_dns",
  "lovable_auth",
  "lovable_not_found",
  "lovable_unavailable",
] as const;
export type LovableError = (typeof LOVABLE_ERRORS)[number];

/**
 * Asks /api/integrations/lovable/health whether the Lovable site answers
 * GET /api/public/rankoya/health with this RANKOYA_API_KEY. Run before the
 * connection is saved, so a wrong key or a missing route never gets saved.
 */
export async function checkLovableHealth(input: {
  baseUrl: string;
  apiKey: string;
}): Promise<{ ok: true } | { ok: false; error: LovableError }> {
  try {
    const res = await fetch("/api/integrations/lovable/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_url: input.baseUrl, api_key: input.apiKey }),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; code?: string } | null;
    if (res.ok && body?.ok) return { ok: true };
    const code = body?.code ?? "";
    return {
      ok: false,
      error: (LOVABLE_ERRORS as readonly string[]).includes(code) ? (code as LovableError) : "lovable_unavailable",
    };
  } catch {
    return { ok: false, error: "lovable_unavailable" };
  }
}
