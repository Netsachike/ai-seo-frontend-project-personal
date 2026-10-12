import type { CustomDomainConfig, LoginCarouselSlide } from "@/services/custom-domain";

/**
 * Brand configuration resolved per request host.
 *
 * Rankoya serves two kinds of host: the vendor host (`NEXT_PUBLIC_APP_HOST`, plus
 * localhost during development) and white-label tenant domains that resellers
 * point at us. On a tenant host the workspace's saved custom-domain config
 * replaces the Rankoya identity (colours, logo, favicon, brand name).
 */
export type BrandConfig = {
  brand_name: string;
  logo_url: string | null;
  logo_icon_url: string | null;
  favicon_url: string | null;
  login_carousel: LoginCarouselSlide[] | null;
  default_theme: "dark" | "light" | "user" | null;
  primary_color: string;
  secondary_color: string;
  background_color: string | null;
  text_color: string | null;
  button_color: string | null;
  button_text_color: string | null;
  support_email: string | null;
  reply_to_email: string | null;
  hide_vendor_branding: boolean;
};

/**
 * Rankoya's stock palette, from the light tokens in globals.css. These seed the
 * configure form, so a reseller who leaves the pickers alone gets an app that
 * looks exactly like Rankoya.
 *
 * Where each colour lands at runtime (see `deriveTenantTokens`):
 *   primary    → links, active nav item, focus ring, "You" chart series
 *   secondary  → the navy sidebar
 *   button     → primary buttons (`bg-ink`), with button text on top
 *   background / text → the sign-in brand panel
 */
export const DEFAULT_BRAND_COLORS = {
  primary_color: "#2563eb", // --blue
  secondary_color: "#0f1b33", // --nav-bg
  background_color: "#0b1220", // dark --bg (sign-in panel)
  text_color: "#eef2f8", // dark --text (sign-in panel)
  button_color: "#2563eb", // --ink
  button_text_color: "#ffffff", // --ink-fg
} as const;

/**
 * The stock sign-in carousel. Copy is English source text that resellers can
 * overwrite per slide; `{brand}` resolves to the tenant's brand name.
 */
export const DEFAULT_LOGIN_CAROUSEL: LoginCarouselSlide[] = [
  {
    url: "/login/slide-visibility.webp",
    position: 1,
    kicker: "AI visibility",
    title: "See where you show up in AI answers.",
    description: "Track how ChatGPT, Claude, Gemini and Perplexity mention your brand, all in {brand}.",
  },
  {
    url: "/login/slide-rankings.webp",
    position: 2,
    kicker: "Rankings and competitors",
    title: "Know who outranks you, and why.",
    description: "Google positions and AI share of voice side by side, every week.",
  },
  {
    url: "/login/slide-agent.webp",
    position: 3,
    kicker: "Your SEO agent",
    title: "Approve the fix. {brand} does the work.",
    description: "Articles and on-page fixes drafted for you, published only after you say yes.",
  },
];

/** Resolves `{brand}` in carousel copy, so stock wording names the tenant. */
export function applyBrandToCopy(text: string | null | undefined, brandName: string): string | null {
  if (!text) return null;
  return text.replace(/\{brand\}/g, brandName);
}

/**
 * The copy a slide should show: whatever the reseller typed, else the stock
 * wording for that position. Positions beyond the defaults have none.
 */
export function resolveSlideCopy(
  slide: LoginCarouselSlide,
  index: number,
  brandName: string,
): { kicker: string | null; title: string | null; description: string | null } {
  const fallback = DEFAULT_LOGIN_CAROUSEL[index];

  return {
    kicker: applyBrandToCopy(slide.kicker || fallback?.kicker, brandName),
    title: applyBrandToCopy(slide.title || fallback?.title, brandName),
    description: applyBrandToCopy(slide.description || fallback?.description, brandName),
  };
}

/**
 * Keeps only usable slides and sorts them by the saved position, so the order
 * a reseller picked survives however the backend returns the array. Returns
 * null for an empty or absent list; the caller then falls back to defaults.
 */
export function normalizeCarousel(slides: LoginCarouselSlide[] | null | undefined): LoginCarouselSlide[] | null {
  if (!Array.isArray(slides)) return null;

  const usable = slides
    .filter((slide) => Boolean(slide?.url))
    .map((slide, index) => ({
      ...slide,
      url: slide.url,
      position: Number.isFinite(slide.position) ? slide.position : index + 1,
    }))
    .sort((a, b) => a.position - b.position);

  return usable.length > 0 ? usable : null;
}

/** localStorage key prefix, namespaced by host so two tenant domains can't paint each other's brand. */
export const BRAND_CONFIG_STORAGE_PREFIX = "rankoya_brand_config";

/** Strips protocol, path and port, then lowercases. Every host comparison goes through this. */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
}

export const DEFAULT_APP_HOST = normalizeHost(process.env.NEXT_PUBLIC_APP_HOST) || "app.rankoya.uk";

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

/** The stock Rankoya identity. */
export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  brand_name: "Rankoya",
  logo_url: null,
  logo_icon_url: null,
  favicon_url: null,
  login_carousel: null,
  default_theme: null,
  primary_color: DEFAULT_BRAND_COLORS.primary_color,
  secondary_color: DEFAULT_BRAND_COLORS.secondary_color,
  background_color: DEFAULT_BRAND_COLORS.background_color,
  text_color: DEFAULT_BRAND_COLORS.text_color,
  button_color: DEFAULT_BRAND_COLORS.button_color,
  button_text_color: DEFAULT_BRAND_COLORS.button_text_color,
  support_email: null,
  reply_to_email: null,
  hide_vendor_branding: false,
};

/**
 * True for the vendor host, Vercel preview deploys and local development,
 * which always behave as the vendor host so they never render a
 * half-resolved tenant.
 */
export function isDefaultAppHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  return normalized === DEFAULT_APP_HOST || LOCAL_DEV_HOSTS.has(normalized) || normalized.endsWith(".vercel.app");
}

/** True when nothing distinguishes the config from stock Rankoya. */
export function isVendorBranding(config: BrandConfig): boolean {
  return (
    config.brand_name === DEFAULT_BRAND_CONFIG.brand_name &&
    !config.logo_url &&
    !config.logo_icon_url &&
    !config.favicon_url &&
    config.primary_color === DEFAULT_BRAND_CONFIG.primary_color
  );
}

/**
 * Overlays a saved custom-domain config onto a base brand. Strings fall back
 * on empty (`||`) while nullable assets keep an explicit `null` (`??`), so
 * clearing a logo in the configure dialog actually clears it.
 */
export function mergeBrandConfig(
  base: BrandConfig,
  config: Partial<CustomDomainConfig> | null | undefined,
  brandName?: string | null,
): BrandConfig {
  if (!config) {
    return brandName ? { ...base, brand_name: brandName } : base;
  }

  return {
    brand_name: brandName || base.brand_name,
    logo_url: config.logo_url ?? base.logo_url,
    logo_icon_url: config.logo_icon_url ?? base.logo_icon_url,
    favicon_url: config.favicon_url ?? base.favicon_url,
    login_carousel: normalizeCarousel(config.login_carousel) ?? base.login_carousel,
    default_theme: config.default_theme ?? base.default_theme,
    primary_color: config.primary_color || base.primary_color,
    secondary_color: config.secondary_color || base.secondary_color,
    background_color: config.background_color ?? base.background_color,
    text_color: config.text_color ?? base.text_color,
    button_color: config.button_color ?? base.button_color,
    button_text_color: config.button_text_color ?? base.button_text_color,
    support_email: config.support_email ?? base.support_email,
    reply_to_email: config.reply_to_email ?? base.reply_to_email,
    hide_vendor_branding: base.hide_vendor_branding,
  };
}

/** Parses `#rgb` / `#rrggbb`. Returns null for anything else. */
export function parseHexColor(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const value = hex.trim().replace(/^#/, "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  return /^[0-9a-f]{6}$/i.test(expanded) ? `#${expanded.toLowerCase()}` : null;
}

/**
 * The Rankoya tokens a tenant config overrides, inline on `:root`. Hover states
 * are derived in CSS with `color-mix`, so only base colours are needed. Tints
 * (`--blue-bg`) are mixed toward the surface so they work in both themes.
 */
export function deriveTenantTokens(config: BrandConfig): Record<string, string> {
  const tokens: Record<string, string> = {};
  const primary = parseHexColor(config.primary_color);
  const secondary = parseHexColor(config.secondary_color);
  const button = parseHexColor(config.button_color) ?? primary;
  const buttonText = parseHexColor(config.button_text_color);
  const background = parseHexColor(config.background_color);
  const text = parseHexColor(config.text_color);

  if (primary) {
    tokens["--blue"] = primary;
    tokens["--blue-ink"] = `color-mix(in oklab, ${primary}, var(--text) 25%)`;
    tokens["--blue-bg"] = `color-mix(in oklab, ${primary} 14%, var(--surface))`;
    tokens["--chart-you"] = primary;
    tokens["--nav-active"] = primary;
  }
  if (secondary) {
    tokens["--nav-bg"] = secondary;
    tokens["--nav-card"] = `color-mix(in oklab, ${secondary}, white 6%)`;
    tokens["--nav-border"] = `color-mix(in oklab, ${secondary}, white 10%)`;
  }
  if (button) tokens["--ink"] = button;
  if (buttonText) tokens["--ink-fg"] = buttonText;
  if (background) tokens["--tenant-bg"] = background;
  if (text) tokens["--tenant-text"] = text;
  return tokens;
}

/** Every token `deriveTenantTokens` can set, so they can all be cleared. */
export const TENANT_TOKEN_NAMES = [
  "--blue",
  "--blue-ink",
  "--blue-bg",
  "--chart-you",
  "--nav-active",
  "--nav-bg",
  "--nav-card",
  "--nav-border",
  "--ink",
  "--ink-fg",
  "--tenant-bg",
  "--tenant-text",
] as const;
