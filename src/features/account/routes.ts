/**
 * URL contracts for the shared account pages. These match the other Netsach
 * products, so links and redirects from the backend (emails, OAuth callbacks)
 * work the same way here.
 */
export const SETTINGS_TABS = ["profile", "workspaces", "subscriptions", "team-members"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function normalizeSettingsTab(tab: string | null | undefined): SettingsTab {
  return (SETTINGS_TABS as readonly string[]).includes(tab ?? "") ? (tab as SettingsTab) : "profile";
}

export const accountHref = {
  settings: (tab: SettingsTab = "profile") => `/settings?tab=${tab}`,
  createWorkspace: () => "/settings?tab=workspaces&workspaceModal=create",
  workspace: (id: number | string, dnsDomainId?: number | string | null) =>
    dnsDomainId ? `/workspaces/${id}?dns=${dnsDomainId}` : `/workspaces/${id}`,
  upgrade: (tab?: "whitelabel") => (tab ? `/upgrade?tab=${tab}` : "/upgrade"),
  resellers: () => "/resellers",
  agency: () => "/agency",
  admin: () => "/admin/user-management",
} as const;

/** Old Rankoya settings sub-routes, mapped onto the shared tabs. */
export const legacySettingsTab: Record<string, SettingsTab> = {
  profile: "profile",
  security: "profile",
  workspace: "workspaces",
  team: "team-members",
  billing: "subscriptions",
};
