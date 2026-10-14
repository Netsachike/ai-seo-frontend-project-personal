/**
 * Rankoya's integrations. The connect patterns come from the shared Netsach
 * integrations page (OAuth in a popup that reports back with postMessage,
 * or a manual form), applied to the tools Rankoya works with.
 */
export const INTEGRATION_PROVIDERS = [
  "telegram",
  "wordpress",
  "wordpressCom",
  "searchConsole",
  "analytics",
  "shopify",
  "webflow",
  "wix",
  "ghost",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

/**
 * oauth: the backend's redirect flow (Search Console, WordPress.com).
 * credentials: a publishing connection created and tested through the
 * backend. code: Telegram's chat link (no endpoint yet, so it is "soon").
 */
export type ConnectMethod = "oauth" | "credentials" | "code";

/**
 * The tabs on the integrations page. "ai" holds the AI engines Rankoya
 * tracks, which are switched on and off rather than connected, so it has no
 * providers here (see `useTrackedEngines`).
 */
export const INTEGRATION_CATEGORIES = ["ai", "platforms", "analytics", "messaging"] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export type ProviderMeta = {
  /** Shown when there's no logo file for the provider. Not translated. */
  monogram: string;
  category: Exclude<IntegrationCategory, "ai">;
  /** Whether the backend serves it yet; mock-only providers keep their connections in the browser. */
  backend: boolean;
  method: ConnectMethod | null;
  /** Where the account lives: one per user (Telegram) or one per brand. */
  scope: "user" | "brand";
  soon?: boolean;
};

export const PROVIDERS: Record<IntegrationProvider, ProviderMeta> = {
  // No endpoints yet: shown as coming soon, never connected.
  telegram: { monogram: "TG", category: "messaging", method: "code", scope: "user", backend: false, soon: true },
  wordpress: { monogram: "WP", category: "platforms", method: "credentials", scope: "brand", backend: true },
  wordpressCom: { monogram: "WP", category: "platforms", method: "oauth", scope: "brand", backend: true },
  searchConsole: { monogram: "GSC", category: "analytics", method: "oauth", scope: "brand", backend: true },
  analytics: { monogram: "GA", category: "analytics", method: "oauth", scope: "brand", backend: false, soon: true },
  shopify: { monogram: "SH", category: "platforms", method: "credentials", scope: "brand", backend: true },
  webflow: { monogram: "WF", category: "platforms", method: "credentials", scope: "brand", backend: true },
  wix: { monogram: "WX", category: "platforms", method: "credentials", scope: "brand", backend: true },
  ghost: { monogram: "GH", category: "platforms", method: "credentials", scope: "brand", backend: true },
};

/** Providers on one tab, in catalog order (available ones first, then "soon"). */
export function providersIn(category: IntegrationCategory): IntegrationProvider[] {
  return INTEGRATION_PROVIDERS.filter((p) => PROVIDERS[p].category === category).sort(
    (a, b) => Number(Boolean(PROVIDERS[a].soon)) - Number(Boolean(PROVIDERS[b].soon)),
  );
}

export const isIntegrationProvider = (value: string): value is IntegrationProvider =>
  (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
