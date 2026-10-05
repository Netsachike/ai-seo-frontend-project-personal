"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type { Brand } from "@/lib/api/types";
import { api, unwrap } from "@/lib/api/client";
import { workspaceKeys } from "@/lib/api/query-keys";
import { useUiStore } from "@/lib/store/ui";
import { useWorkspaces } from "@/features/workspace/hooks";
import { OrbitMark } from "@/components/brand/logo";

/** Picks the active (or first) workspace, then its last-used brand, else onboarding. */
export function RootRedirect() {
  const t = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const workspaces = useWorkspaces();

  React.useEffect(() => {
    const list = workspaces.data;
    if (!list) return;
    const store = useUiStore.getState();
    const workspace = list.find((w) => w.id === store.workspaceId) ?? list[0];
    if (!workspace) return router.replace("/onboarding/brand");
    store.setWorkspace(workspace.id);

    void (async () => {
      let slug = workspace.lastBrandSlug ?? null;
      if (!slug) {
        const brands = await queryClient.fetchQuery<Brand[]>({
          queryKey: workspaceKeys.brands(workspace.id),
          queryFn: async () =>
            unwrap(
              await api.GET("/workspaces/{workspaceId}/brands", { params: { path: { workspaceId: workspace.id } } }),
            ),
        });
        slug = brands[0]?.slug ?? null;
      }
      if (!slug) return router.replace("/onboarding/brand");
      store.setBrand(slug);
      router.replace(`/${slug}/overview`);
    })();
  }, [workspaces.data, queryClient, router]);

  return (
    <div className="grid min-h-dvh place-items-center" aria-busy>
      <OrbitMark size={32} className="animate-pulse text-fg" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
