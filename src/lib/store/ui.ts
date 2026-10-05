import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { readClientCookie, setClientCookie } from "@/lib/cookies";

export const WORKSPACE_COOKIE = "orbit_ws";
export const BRAND_COOKIE = "orbit_brand";

/**
 * UI state only. Server data lives in React Query; URL state lives in nuqs.
 * The active workspace and brand are also mirrored to cookies so proxy.ts and
 * Server Components know them on the next request.
 */
type UiState = {
  sidebarCollapsed: boolean;
  agentPanelOpen: boolean;
  commandOpen: boolean;
  workspaceId: string | null;
  brandSlug: string | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setAgentPanelOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setWorkspace: (id: string) => void;
  setBrand: (slug: string) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      agentPanelOpen: false,
      commandOpen: false,
      workspaceId: readClientCookie(WORKSPACE_COOKIE) ?? null,
      brandSlug: readClientCookie(BRAND_COOKIE) ?? null,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setAgentPanelOpen: (agentPanelOpen) => set({ agentPanelOpen }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setWorkspace: (workspaceId) => {
        setClientCookie(WORKSPACE_COOKIE, workspaceId);
        set({ workspaceId });
      },
      setBrand: (brandSlug) => {
        setClientCookie(BRAND_COOKIE, brandSlug);
        set({ brandSlug });
      },
    }),
    {
      name: "orbit-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);

/** Read outside React (API client middleware). */
export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return useUiStore.getState().workspaceId ?? readClientCookie(WORKSPACE_COOKIE) ?? null;
}
