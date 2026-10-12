import { create } from "zustand";

import { readClientCookie, setClientCookie } from "@/lib/cookies";

export const WORKSPACE_COOKIE = "rankoya_ws";
export const BRAND_COOKIE = "rankoya_brand";
/** "1" when the sidebar is collapsed. A cookie so the server renders the right width. */
export const SIDEBAR_COOKIE = "rankoya_sidebar";

/**
 * UI state only. Server data lives in React Query; URL state lives in nuqs.
 * The active workspace, brand and sidebar width are mirrored to cookies so
 * proxy.ts and Server Components know them on the next request.
 */
type UiState = {
  /** null until the user toggles it; the shell then falls back to the server's cookie value. */
  sidebarCollapsed: boolean | null;
  agentPanelOpen: boolean;
  /** Composer text shared by the agent panel and /agent, so ⌘K can hand a question over. */
  agentDraft: string;
  commandOpen: boolean;
  workspaceId: string | null;
  brandSlug: string | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAgentPanelOpen: (open: boolean) => void;
  setAgentDraft: (draft: string) => void;
  /** Opens the agent panel, optionally with a question ready to send. */
  askRankoya: (draft?: string) => void;
  setCommandOpen: (open: boolean) => void;
  setWorkspace: (id: string) => void;
  setBrand: (slug: string) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  sidebarCollapsed: null,
  agentPanelOpen: false,
  agentDraft: "",
  commandOpen: false,
  workspaceId: readClientCookie(WORKSPACE_COOKIE) ?? null,
  brandSlug: readClientCookie(BRAND_COOKIE) ?? null,
  setSidebarCollapsed: (sidebarCollapsed) => {
    setClientCookie(SIDEBAR_COOKIE, sidebarCollapsed ? "1" : "0");
    set({ sidebarCollapsed });
  },
  setAgentPanelOpen: (agentPanelOpen) => set({ agentPanelOpen }),
  setAgentDraft: (agentDraft) => set({ agentDraft }),
  askRankoya: (draft) => set((s) => ({ agentPanelOpen: true, agentDraft: draft ?? s.agentDraft })),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setWorkspace: (workspaceId) => {
    setClientCookie(WORKSPACE_COOKIE, workspaceId);
    set({ workspaceId });
  },
  setBrand: (brandSlug) => {
    setClientCookie(BRAND_COOKIE, brandSlug);
    set({ brandSlug });
  },
}));
