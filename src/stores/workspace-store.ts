"use client";

import { create } from "zustand";

import workspaceService from "@/services/workspaces";
import type { AllUserWorkspace } from "@/types/shared";

/**
 * Backend workspaces (shared Netsach API) as the Settings → Workspaces tab and
 * the workspace details page see them. Logic ported verbatim from the handoff.
 */
export interface Workspace {
  id: string;
  name: string;
  members: number;
  image: string | null;
  active: boolean;
}

type WorkspaceStore = {
  workspaces: Workspace[];
  isLoading: boolean;
  isCreatingWorkspace: boolean;
  isChangingWorkspace: boolean;
  isUpdatingWorkspace: boolean;
  isDeletingWorkspace: boolean;
  hasLoaded: boolean;
  error: string | null;
  reset: () => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (input: {
    name: string;
    imagePreview: string | null;
    logoFile: File | null;
  }) => Promise<Workspace | null>;
  activateWorkspace: (id: string) => Promise<void>;
  updateWorkspace: (workspace: Workspace) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
};

const initialState = {
  workspaces: [] as Workspace[],
  isLoading: false,
  isCreatingWorkspace: false,
  isChangingWorkspace: false,
  isUpdatingWorkspace: false,
  isDeletingWorkspace: false,
  hasLoaded: false,
  error: null as string | null,
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  ...initialState,

  reset: () => {
    set({ ...initialState });
  },

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspaceService.getAllWorkspaces();

      const mapped: Workspace[] = (response.userWorkspaces ?? []).map((item: AllUserWorkspace) => ({
        id: String(item.workspace.id),
        name: item.workspace.name,
        members: Number(item.user_count) || 1,
        image: item.workspace.logo || null,
        active: Number(item.is_active) === 1,
      }));

      // Ensure at least one workspace is marked as active
      if (mapped.length > 0 && !mapped.some((w) => w.active)) {
        mapped[0].active = true;
      }

      set({
        workspaces: mapped,
        isLoading: false,
        hasLoaded: true,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  createWorkspace: async (input) => {
    set({ isCreatingWorkspace: true, error: null });

    try {
      await workspaceService.createWorkspace({
        name: input.name,
        slug: slugify(input.name),
        is_default: 0,
        logo: input.logoFile,
      });

      await get().fetchWorkspaces();

      const createdWorkspace = get().workspaces.find(
        (workspace) => workspace.name.toLowerCase() === input.name.toLowerCase(),
      );

      set({ isCreatingWorkspace: false });
      return createdWorkspace || null;
    } catch (error) {
      set({
        isCreatingWorkspace: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  activateWorkspace: async (id) => {
    const workspaceId = Number(id);
    if (Number.isNaN(workspaceId)) {
      throw new Error("Invalid workspace id.");
    }

    set({ isChangingWorkspace: true, error: null });

    try {
      await workspaceService.activateWorkspace({ id: workspaceId });
      await get().fetchWorkspaces();
      set({ isChangingWorkspace: false });
    } catch (error) {
      set({
        isChangingWorkspace: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  updateWorkspace: async (workspace) => {
    const workspaceId = Number(workspace.id);
    if (Number.isNaN(workspaceId)) {
      throw new Error("Invalid workspace id.");
    }

    set({ isUpdatingWorkspace: true, error: null });

    try {
      await workspaceService.updateWorkspace({
        id: workspaceId,
        name: workspace.name,
        slug: slugify(workspace.name),
        is_default: workspace.active ? 1 : 0,
      });

      await get().fetchWorkspaces();
      set({ isUpdatingWorkspace: false });
    } catch (error) {
      set({
        isUpdatingWorkspace: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  deleteWorkspace: async (id) => {
    const workspaceId = Number(id);
    if (Number.isNaN(workspaceId)) {
      throw new Error("Invalid workspace id.");
    }

    set({ isDeletingWorkspace: true, error: null });

    try {
      await workspaceService.deleteWorkspace({ id: workspaceId });
      await get().fetchWorkspaces();
      set({ isDeletingWorkspace: false });
    } catch (error) {
      set({
        isDeletingWorkspace: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
}));
