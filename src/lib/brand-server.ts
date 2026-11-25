import { cache } from "react";
import { headers } from "next/headers";

import {
  DEFAULT_BRAND_CONFIG,
  isDefaultAppHost,
  mergeBrandConfig,
  normalizeHost,
  type BrandConfig,
} from "@/config/brand";
import type { ResolvedDomain } from "@/services/custom-domain";

/** How long the server reuses a tenant's brand before asking the backend again. */
const BRAND_REVALIDATE_SECONDS = 60;
/** A slow backend must not hold the first paint; the browser resolves again anyway. */
const RESOLVE_TIMEOUT_MS = 3_000;

/** The host this request was served on, normalised. */
export async function requestHost(): Promise<string> {
  const headerStore = await headers();
  return normalizeHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host"));
}

/**
 * The White Label brand for a tenant host, resolved on the server so the first
 * HTML already carries the reseller's logo, favicon, title and colours.
 * Null on Rankoya's own host, for an unknown domain, or when the backend
 * can't be reached in time (the browser's own lookup then takes over).
 * Memoised per request, so the layout and generateMetadata share one call.
 */
export const resolveTenantBrand = cache(async (host: string): Promise<BrandConfig | null> => {
  if (!host || isDefaultAppHost(host)) return null;
  const base = (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!base) return null;

  try {
    const response = await fetch(
      `${base.replace(/\/+$/, "")}/custom-domains/resolve?domain=${encodeURIComponent(host)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: BRAND_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as { success?: boolean; data?: ResolvedDomain } | null;
    const resolved = payload?.success ? payload.data : null;
    if (!resolved) return null;
    return mergeBrandConfig(
      DEFAULT_BRAND_CONFIG,
      resolved.config,
      resolved.config?.brand_name ?? resolved.workspace?.name ?? null,
    );
  } catch {
    return null;
  }
});
