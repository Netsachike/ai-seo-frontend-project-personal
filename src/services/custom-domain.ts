import api from "./api/api";

/** One slide on the sign-in carousel. `position` is 1-based and authoritative —
 * the array order a reseller saves may not survive the backend round-trip. */
export type LoginCarouselSlide = {
  url: string;
  position: number;
  /** Optional copy. Blank falls back to the stock wording for that position,
   * with `{brand}` resolved to the tenant's brand name. */
  kicker?: string | null;
  title?: string | null;
  description?: string | null;
};

export type CustomDomainConfig = {
  brand_name: string | null;
  logo_url: string | null;
  /** Square/short-form mark for the collapsed sidebar and tight headers. */
  logo_icon_url: string | null;
  favicon_url: string | null;
  login_carousel: LoginCarouselSlide[] | null;
  /** Appearance a first-time visitor gets. "user" leaves their own choice alone. */
  default_theme: "dark" | "light" | "user" | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  button_color: string;
  button_text_color: string;
  support_email: string | null;
  reply_to_email: string | null;
};

export type SaveCustomDomainPayload = {
  domain: string;
  config: CustomDomainConfig;
};

export type UpdateVerificationPayload = {
  verified: boolean;
  configured: boolean;
  status: "active" | "pending";
  ssl_status: "active" | "pending";
  error: string | null;
};

/** The shape /custom-domains/resolve answers with for a tenant host. */
export type ResolvedDomain = {
  domain: string;
  workspace_id: number;
  config: Partial<CustomDomainConfig> | null;
  workspace?: {
    id?: number;
    name?: string | null;
    slug?: string | null;
    logo?: string | null;
  } | null;
};

/**
 * A falsy `success` is the ordinary answer on the vendor host — it means no
 * tenant owns this domain, so the app keeps its stock branding.
 */
type ResolveDomainResponse = {
  success: boolean;
  message?: string;
  domain?: string;
  data?: ResolvedDomain;
};

class CustomDomainService {
  async saveDomain(payload: SaveCustomDomainPayload) {
    const response = await api.post("/custom-domains", payload);
    return response.data;
  }

  // /custom-domains/{customDomain}/config
  async updateConfig({
    payload,
    id,
  }: {
    payload: { config: CustomDomainConfig };
    id: number | string;
  }) {
    const response = await api.patch(`/custom-domains/${id}/config`, payload);
    return response.data;
  }
  async updateVerification(
    id: number | string,
    payload: UpdateVerificationPayload,
  ) {
    const response = await api.patch(
      `/custom-domains/${id}/verification`,
      payload,
    );
    return response.data;
  }

  async getUserDomains() {
    const response = await api.get("/custom-domains");
    return response.data;
  }

  /** Removes the domain record from our backend. Callers must drop it from the
   * Vercel project first — see DELETE /api/custom-domains/[domain]. */
  async deleteDomain(id: number | string) {
    const response = await api.delete(`/custom-domains/${id}`);
    return response.data;
  }

  /**
   * Public brand lookup for the host the app is being served from. Runs on
   * every page load, before anyone signs in, so the host travels as a query
   * param rather than being inferred from the session.
   *
   * Returns null when no active tenant claims the host — the vendor host
   * itself answers that way, which is how the app falls back to stock styling.
   */
  async resolveDomain(host?: string): Promise<ResolvedDomain | null> {
    const tenantHost =
      host ?? (typeof window !== "undefined" ? window.location.hostname : "");

    if (!tenantHost) return null;

    const response = await api.get<ResolveDomainResponse>(
      "/custom-domains/resolve",
      { params: { domain: tenantHost } },
    );

    const payload = response.data;
    if (!payload?.success || !payload.data) return null;
    return payload.data;
  }
}

const customDomainService = new CustomDomainService();

export default customDomainService;
