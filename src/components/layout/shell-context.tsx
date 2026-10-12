"use client";

import * as React from "react";

import type { AllUserWorkspace, Site } from "@/types/types";
import type { Me } from "@/lib/mocks/types";

export type ShellValue = {
  /** The `/[brand]` route segment: the site id. Empty on the sites page. */
  brandSlug: string;
  /** The open site. */
  brand: Site | undefined;
  /** The workspace the backend has active. */
  workspace: AllUserWorkspace | undefined;
  workspaces: AllUserWorkspace[];
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
