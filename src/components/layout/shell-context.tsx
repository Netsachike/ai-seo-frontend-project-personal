"use client";

import * as React from "react";

import type { Brand, Me, Workspace } from "@/lib/api/types";

export type ShellValue = {
  brandSlug: string;
  brand: Brand | undefined;
  workspace: Workspace | undefined;
  workspaces: Workspace[];
  me: Me | undefined;
  /** Server-rendered value until the user toggles it. */
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  openMobileNav: () => void;
  openHelp: () => void;
  openFeedback: () => void;
};

const ShellContext = React.createContext<ShellValue | null>(null);

export const ShellProvider = ShellContext.Provider;

export function useShell(): ShellValue {
  const value = React.useContext(ShellContext);
  if (!value) throw new Error("useShell must be used inside the app shell");
  return value;
}
