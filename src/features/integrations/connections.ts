"use client";

import type { PublishingConnection } from "@/types/types";
import { isGscReady, useGscOverview } from "@/features/search-console/hooks";
import { isPublishingPlatform } from "@/features/publishing/forms";
import { usePublishingConnections } from "@/features/publishing/hooks";
import { INTEGRATION_PROVIDERS, PROVIDERS, type IntegrationProvider } from "./catalog";
import { connectionsFor, useIntegrations } from "./store";

/** One connected account, whichever source it came from. */
export type ProviderAccount = {
  id: string;
  name: string;
  detail: string;
  connectedAt: string;
  /** Publishing connections only: `pending` or `error` still need a passing test. */
  status?: PublishingConnection["status"];
  lastError?: string | null;
  /** Backend publishing connection id, for testing and publishing. */
  connectionId?: number;
  /** Shopify: the blog saved on the connection. */
  blogId?: string | null;
};

const publishingAccount = (c: PublishingConnection): ProviderAccount => ({
  id: String(c.id),
  name: c.name,
  detail: typeof c.config?.site_url === "string" ? c.config.site_url : c.method === "webhook" ? "" : c.platform,
  connectedAt: c.created_at,
  status: c.status,
  lastError: c.last_error,
  connectionId: c.id,
  blogId: typeof c.config?.blog_id === "string" ? c.config.blog_id : null,
});

/** The app builder a manual connection was made for (Lovable or Replit), or null. */
// Replit is hidden for now (its API needs a paid plan); its connections fall back to the general copy-and-paste card.
export function manualBuilderOf(c: PublishingConnection): "lovable" | null {
  if (c.method !== "manual") return null;
  const tag = typeof c.config?.provider === "string" ? c.config.provider : c.name.trim().toLowerCase();
  return tag === "lovable" /* || tag === "replit" */ ? tag : null;
}

/**
 * Accounts per provider for one site: publishing connections and Search
 * Console from the backend, Analytics and Telegram from the browser store
 * (no endpoint yet).
 */
export function useProviderAccounts(siteId: number | undefined, brandSlug: string) {
  const publishing = usePublishingConnections(siteId);
  const gsc = useGscOverview(siteId);
  const local = useIntegrations((s) => s.connections);

  const accounts = Object.fromEntries(
    INTEGRATION_PROVIDERS.map((provider): [IntegrationProvider, ProviderAccount[]] => {
      if (isPublishingPlatform(provider)) {
        return [
          provider,
          (publishing.data ?? [])
            // Lovable also keeps the copy-and-paste connections made before its API connection existed:
            // manual connections tagged with config.provider (or, without the tag, named after the card).
            .filter((c) => (c.platform === provider && c.method !== "manual") || manualBuilderOf(c) === provider)
            .map(publishingAccount),
        ];
      }
      // Replit, copy and paste (hidden for now):
      // if (provider === "replit") {
      //   return [provider, (publishing.data ?? []).filter((c) => manualBuilderOf(c) === provider).map(publishingAccount)];
      // }
      // Copy and paste: Next.js apps on their own card, every other manual connection on the general one.
      if (provider === "nextjs" || provider === "manual") {
        return [
          provider,
          (publishing.data ?? [])
            .filter(
              (c) =>
                c.method === "manual" &&
                manualBuilderOf(c) === null &&
                (c.platform === "nextjs") === (provider === "nextjs"),
            )
            .map(publishingAccount),
        ];
      }
      // Webhooks are saved as platform `custom`; config.provider says which card they belong to.
      if (PROVIDERS[provider].method === "webhook") {
        return [
          provider,
          (publishing.data ?? [])
            .filter((c) => c.method === "webhook" && c.config?.provider === provider)
            .map(publishingAccount),
        ];
      }
      // The feed is a link, not a connection.
      if (provider === "rss") return [provider, []];
      if (provider === "wordpressCom") {
        return [provider, (publishing.data ?? []).filter((c) => c.platform === "wordpress_com").map(publishingAccount)];
      }
      if (provider === "searchConsole") {
        const connection = gsc.data?.connection;
        return [
          provider,
          connection && isGscReady(connection)
            ? [
                {
                  id: String(connection.id),
                  name: connection.property ?? "",
                  detail: connection.google_email ?? "",
                  connectedAt: connection.created_at,
                },
              ]
            : [],
        ];
      }
      return [
        provider,
        connectionsFor(local, provider, brandSlug).map((c) => ({
          id: c.id,
          name: c.account.name,
          detail: c.account.detail,
          connectedAt: c.connectedAt,
        })),
      ];
    }),
  ) as Record<IntegrationProvider, ProviderAccount[]>;

  return {
    accounts,
    isPending: Boolean(siteId) && (publishing.isPending || gsc.isPending),
    /** A provider counts as connected once one account is usable. */
    isConnected: (provider: IntegrationProvider) =>
      accounts[provider].some((a) => !a.status || a.status === "active") && !PROVIDERS[provider].soon,
  };
}
