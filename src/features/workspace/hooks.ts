"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { AllUserWorkspace, Role, Site } from "@/types/types";
import { getSessionUserFromCookie, writeSessionUserCookie } from "@/lib/auth-session";
import { getMe, getUsage } from "@/lib/mocks/store";
import { meKeys, siteKeys, workspaceKeys } from "@/lib/api/query-keys";
import { useUiStore } from "@/lib/store/ui";
import authService from "@/services/auth";
import siteService from "@/services/sites";
import workspaceService from "@/services/workspaces";
import { useSessionUser } from "@/features/account/use-session-user";
import { siteIdFromSlug, siteSlug } from "@/features/sites/site-utils";

/**
 * The signed-in user. Name, email and id come from the `authUser` session
 * cookie (written from the login response); UI preferences (language, theme,
 * Telegram) have no backend endpoint yet, so they stay on mock data. Waits
 * for the cookie to be read so the mock identity never shows.
 */
export function useMe() {
  const session = useSessionUser();
  useProfileRefresh(session);
  return useQuery({
    queryKey: meKeys.all,
    queryFn: getMe,
    staleTime: 5 * 60_000,
    enabled: session !== undefined,
    select: (me) => ({
      ...me,
      id: session ? String(session.id) : "",
      name: session ? session.fullName || `${session.firstName} ${session.lastName}`.trim() || session.email : "",
      email: session?.email ?? "",
      // No Telegram endpoint yet: never connected.
      telegram: null,
    }),
  });
}

/**
 * The user's workspaces (`GET /workspace`). The backend decides which one is
 * active: every site-scoped endpoint resolves it from the token.
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspaceService.getAllWorkspaces,
    select: (response) => {
      const list = response.userWorkspaces ?? [];
      const current = Array.isArray(response.currentWorkspace)
        ? response.currentWorkspace[0]
        : response.currentWorkspace;
      const activeId = current?.id ?? list.find((w) => Boolean(w.is_active))?.work_space_id;
      return { list, active: list.find((w) => w.work_space_id === activeId) ?? list[0] };
    },
  });
}

/** Sites in the active workspace (`GET /sites`). */
export function useSites(workspaceId: number | undefined) {
  return useQuery({
    queryKey: siteKeys.list(workspaceId ?? 0),
    enabled: Boolean(workspaceId),
    queryFn: async () => (await siteService.list()).data,
  });
}

/** One site with its settings. 404 when it is not in the active workspace. */
export function useSite(siteId: number | undefined) {
  return useQuery({
    queryKey: siteKeys.detail(siteId ?? 0),
    enabled: Boolean(siteId),
    queryFn: async () => (await siteService.get(siteId as number)).data,
  });
}

/**
 * `GET /me` on load: confirms the token is still valid (a 401 signs the user
 * out) and keeps the cookie's name and email in step with the backend.
 */
function useProfileRefresh(session: ReturnType<typeof useSessionUser>) {
  const profile = useQuery({
    queryKey: [...meKeys.all, "profile"],
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
    queryFn: async () => (await authService.me()).data,
  });
  React.useEffect(() => {
    const user = profile.data;
    if (!user || !session) return;
    if (user.name === session.fullName && user.email === session.email) return;
    const [firstName, ...rest] = user.name.trim().split(/s+/);
    writeSessionUserCookie({
      ...session,
      fullName: user.name,
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      email: user.email,
    });
  }, [profile.data, session]);
}

/** Usage meters have no backend endpoint yet, so they stay on mock data. */
export function useUsage(workspaceId: number | undefined) {
  return useQuery({
    queryKey: workspaceKeys.usage(workspaceId ?? 0),
    enabled: Boolean(workspaceId),
    queryFn: () => getUsage(String(workspaceId)),
  });
}

/** Resolves the `/[brand]` segment (a site id) to the site and the active workspace. */
export function useBrandLookup(slug: string) {
  const siteId = siteIdFromSlug(slug);
  const workspaces = useWorkspaces();
  const site = useSite(Number.isNaN(siteId) ? undefined : siteId);

  const status = (site.error as { response?: { status?: number } } | null)?.response?.status;
  return {
    workspace: workspaces.data?.active,
    brand: site.data,
    workspaces: workspaces.data?.list ?? [],
    isPending: workspaces.isPending || (!Number.isNaN(siteId) && site.isPending && site.fetchStatus !== "idle"),
    notFound: (slug !== "" && Number.isNaN(siteId)) || status === 404,
    isError: workspaces.isError || (site.isError && status !== 404),
  };
}

/** Swaps the brand segment of the current path, so you stay on the same screen. */
function swapBrandInPath(pathname: string, slug: string) {
  const [, , ...rest] = pathname.split("/");
  return `/${slug}/${rest.join("/") || "overview"}`;
}

export function useSwitchBrand() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("shell.switcher");
  return (site: Site) => {
    const slug = siteSlug(site);
    useUiStore.getState().setBrand(slug);
    router.push(swapBrandInPath(pathname, slug));
    toast(t("switchedBrand", { name: site.name }));
  };
}

/** The workspace a switch or create targets: its backend id and name. */
export type WorkspaceTarget = { id: number; name: string };

export const workspaceTarget = (w: AllUserWorkspace): WorkspaceTarget => ({
  id: w.work_space_id,
  name: w.workspace.name,
});

/** The backend sends free-text roles ("owner", "Super Admin", …); anything unknown is treated as a member. */
export function workspaceRole(w: Pick<AllUserWorkspace, "role"> | undefined): Role {
  const role = w?.role?.toLowerCase() ?? "";
  if (role.includes("owner") || role.includes("super")) return "owner";
  if (role.includes("admin")) return "admin";
  if (role.includes("viewer")) return "viewer";
  return "member";
}

/** Keeps the `authUser` cookie's active workspace in step with the backend after a switch. */
function recordActiveWorkspace(workspace: WorkspaceTarget) {
  const session = getSessionUserFromCookie();
  if (!session) return;
  writeSessionUserCookie({ ...session, active_workspace_id: workspace.id, active_workspace_name: workspace.name });
}

/**
 * Activates the workspace on the backend, clears every cached query (data is
 * workspace-scoped), then opens the sites page to pick a site.
 */
export function useSwitchWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("shell.switcher");
  return async (workspace: WorkspaceTarget) => {
    await workspaceService.activateWorkspace({ id: workspace.id });
    recordActiveWorkspace(workspace);
    useUiStore.getState().setWorkspace(String(workspace.id));
    queryClient.clear();
    router.push("/sites");
    toast(t("switchedWorkspace", { name: workspace.name }));
  };
}

/** Creates a workspace and refreshes the list. */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      workspaceService.createWorkspace({
        name,
        slug:
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "workspace",
        is_default: 0,
        logo: null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list() }),
  });
}
