/** React Query keys for the shared account pages (shared Netsach backend). */
export const accountKeys = {
  all: ["account"] as const,
  team: () => [...accountKeys.all, "team"] as const,
  domains: () => [...accountKeys.all, "custom-domains"] as const,
  resellers: () => [...accountKeys.all, "resellers"] as const,
  adminUsers: (page: number, search: string) => [...accountKeys.all, "admin", "users", page, search] as const,
  adminDashboard: () => [...accountKeys.all, "admin", "dashboard"] as const,
  campaigns: () => [...accountKeys.all, "admin", "campaigns"] as const,
  whiteLabelAccess: (userId: number | string) => [...accountKeys.all, "white-label-access", userId] as const,
};
