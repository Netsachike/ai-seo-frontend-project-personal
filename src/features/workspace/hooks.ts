"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Brand, Workspace } from "@/lib/api/types";
import { createWorkspace, getMe, getUsage, listBrands, listWorkspaces } from "@/lib/mocks/store";
import { meKeys, workspaceKeys } from "@/lib/api/query-keys";
import { useUiStore } from "@/lib/store/ui";

export function useMe() {
  return useQuery({
    queryKey: meKeys.all,
    queryFn: getMe,
    staleTime: 5 * 60_000,
  });
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: listWorkspaces,
  });
}

const brandsQuery = (workspaceId: string) => ({
  queryKey: workspaceKeys.brands(workspaceId),
  queryFn: () => listBrands(workspaceId),
});

export function useBrands(workspaceId: string | undefined) {
  return useQuery({ ...brandsQuery(workspaceId ?? "none"), enabled: Boolean(workspaceId) });
}

export function useUsage(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.usage(workspaceId ?? "none"),
    enabled: Boolean(workspaceId),
    queryFn: () => getUsage(workspaceId as string),
  });
}

/**
 * Finds which workspace a brand slug belongs to. The active workspace is
 * checked first, so a shared link into another workspace still resolves.
 */
export function useBrandLookup(slug: string) {
  const preferred = useUiStore((s) => s.workspaceId);
  const workspaces = useWorkspaces();
  const list = workspaces.data ?? [];
  const ordered = [...list].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
  const brandLists = useQueries({ queries: ordered.map((ws) => brandsQuery(ws.id)) });

  let workspace: Workspace | undefined;
  let brand: Brand | undefined;
  ordered.forEach((ws, i) => {
    const found = !brand ? brandLists[i]?.data?.find((b) => b.slug === slug) : undefined;
    if (found) {
      workspace = ws;
      brand = found;
    }
  });

  const settled = workspaces.isSuccess && brandLists.every((q) => !q.isPending);
  return {
    workspace,
    brand,
    workspaces: list,
    isPending: !brand && !settled,
    notFound: settled && !brand,
    isError: workspaces.isError,
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
  return (brand: Brand) => {
    useUiStore.getState().setBrand(brand.slug);
    router.push(swapBrandInPath(pathname, brand.slug));
    toast(t("switchedBrand", { name: brand.name }));
  };
}

/**
 * Clears every cached query (data is workspace-scoped), then opens the
 * workspace's last-used brand, or onboarding when it has none.
 */
export function useSwitchWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("shell.switcher");
  return async (workspace: Workspace) => {
    const store = useUiStore.getState();
    store.setWorkspace(workspace.id);
    const workspaces = queryClient.getQueryData<Workspace[]>(workspaceKeys.list());
    queryClient.clear();
    if (workspaces) queryClient.setQueryData(workspaceKeys.list(), workspaces);

    let slug = workspace.lastBrandSlug ?? null;
    if (!slug) {
      const brands = await queryClient.fetchQuery(brandsQuery(workspace.id)).catch(() => []);
      slug = brands[0]?.slug ?? null;
    }
    if (slug) {
      store.setBrand(slug);
      router.push(`/${slug}/overview`);
    } else {
      router.push("/onboarding/brand");
    }
    toast(t("switchedWorkspace", { name: workspace.name }));
  };
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: (created) => {
      queryClient.setQueryData<Workspace[]>(workspaceKeys.list(), (list) => [...(list ?? []), created]);
    },
  });
}
