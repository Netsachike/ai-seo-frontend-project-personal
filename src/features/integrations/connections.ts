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
};

const publishingAccount = (c: PublishingConnection): ProviderAccount => ({
  id: String(c.id),
  name: c.name,
  detail: typeof c.config?.site_url === "string" ? c.config.site_url : c.platform,
  connectedAt: c.created_at,
  status: c.status,
  lastError: c.last_error,
  connectionId: c.id,
});

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
        return [provider, (publishing.data ?? []).filter((c) => c.platform === provider).map(publishingAccount)];
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
