"use client";

import { create } from "zustand";

import type { IntegrationProvider } from "./catalog";

/**
 * UI-stage connections. Orbit's integration endpoints don't exist yet, so
 * connects and disconnects are kept in memory (they reset on reload), the
 * same way the rest of the UI mock data works.
 */
export type IntegrationConnection = {
  id: string;
  provider: IntegrationProvider;
  /** null for user-level connections (Telegram) */
  brandSlug: string | null;
  account: { name: string; detail: string };
  connectedAt: string;
};

type IntegrationsState = {
  connections: IntegrationConnection[];
  connect: (connection: Omit<IntegrationConnection, "id" | "connectedAt">) => IntegrationConnection;
  disconnect: (id: string) => void;
  update: (id: string, patch: Partial<IntegrationConnection["account"]>) => void;
};

const seed: IntegrationConnection[] = [
  {
    id: "conn_tg",
    provider: "telegram",
    brandSlug: null,
    account: { name: "@fvo_northwind", detail: "Orbit agent chat" },
    connectedAt: "2026-09-21T10:12:00Z",
  },
  {
    id: "conn_gsc",
    provider: "searchConsole",
    brandSlug: "northwind-roasters",
    account: { name: "sc-domain:northwindroasters.com", detail: "Domain property" },
    connectedAt: "2026-09-22T08:40:00Z",
  },
];

let counter = 0;

export const useIntegrations = create<IntegrationsState>()((set) => ({
  connections: seed,
  connect: (connection) => {
    counter += 1;
    const created: IntegrationConnection = {
      ...connection,
      id: `conn_${connection.provider}_${counter}`,
      connectedAt: new Date().toISOString(),
    };
    set((state) => ({ connections: [...state.connections, created] }));
    return created;
  },
  disconnect: (id) => set((state) => ({ connections: state.connections.filter((c) => c.id !== id) })),
  update: (id, patch) =>
    set((state) => ({
      connections: state.connections.map((c) => (c.id === id ? { ...c, account: { ...c.account, ...patch } } : c)),
    })),
}));

/** Connections for one provider that apply to this brand (user-level ones apply everywhere). */
export function connectionsFor(
  connections: IntegrationConnection[],
  provider: IntegrationProvider,
  brandSlug: string,
): IntegrationConnection[] {
  return connections.filter((c) => c.provider === provider && (c.brandSlug === null || c.brandSlug === brandSlug));
}
