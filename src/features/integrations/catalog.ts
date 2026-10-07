/**
 * Orbit's integrations. The connect patterns come from the shared Netsach
 * integrations page (OAuth in a popup that reports back with postMessage,
 * or a manual form), applied to the tools Orbit works with.
 */
export const INTEGRATION_PROVIDERS = [
  "telegram",
  "wordpress",
  "searchConsole",
  "analytics",
  "shopify",
  "webflow",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type ConnectMethod = "oauth" | "manual" | "code";

export type ProviderMeta = {
  monogram: string;
  /** How a connection is made: OAuth popup, a credentials form, or a chat link code. */
  method: ConnectMethod | null;
  /** Where the account lives: one per user (Telegram) or one per brand. */
  scope: "user" | "brand";
  soon?: boolean;
};

export const PROVIDERS: Record<IntegrationProvider, ProviderMeta> = {
  telegram: { monogram: "TG", method: "code", scope: "user" },
  wordpress: { monogram: "WP", method: "manual", scope: "brand" },
  searchConsole: { monogram: "GSC", method: "oauth", scope: "brand" },
  analytics: { monogram: "GA", method: "oauth", scope: "brand" },
  shopify: { monogram: "SH", method: null, scope: "brand", soon: true },
  webflow: { monogram: "WF", method: null, scope: "brand", soon: true },
};

export const isIntegrationProvider = (value: string): value is IntegrationProvider =>
  (INTEGRATION_PROVIDERS as readonly string[]).includes(value);

/** postMessage type the OAuth popup sends its opener. Same on both sides. */
export const INTEGRATION_CONNECTED_MESSAGE = "orbit:integration-connected";

export type IntegrationConnectedMessage = {
  type: typeof INTEGRATION_CONNECTED_MESSAGE;
  provider: IntegrationProvider;
  workspaceId: string | null;
  brand: string | null;
  account?: { name: string; detail: string } | null;
  error?: string | null;
};

/** URL the OAuth popup opens. The backend will redirect here after the provider's consent screen. */
export function oauthSelectUrl(provider: IntegrationProvider, params: { workspaceId?: string | null; brand: string }) {
  const search = new URLSearchParams({ brand: params.brand });
  if (params.workspaceId) search.set("workspace_id", params.workspaceId);
  return `/integrations/${provider}/select?${search.toString()}`;
}
