"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, EllipsisIcon, PlusIcon, SettingsIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { useUiStore } from "@/lib/store/ui";
import { accountHref } from "@/features/account/routes";
import { useSessionUser } from "@/features/account/use-session-user";
import { useSetupStep } from "@/features/site-setup/progress";
import { NEW_SITE_PATH, setupPath, stepNumber, TOTAL_STEPS } from "@/features/site-setup/steps";
import { useSites } from "@/features/workspace/hooks";
import { useShell } from "@/components/layout/shell-context";
import { SiteFavicon } from "@/components/layout/site-favicon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { faviconFor, siteSlug } from "./site-utils";
import { useSiteStats } from "./hooks";

/**
 * Where every session starts: pick the site to work on. Nothing else in the
 * app opens until a site is chosen; the sidebar's site card brings you back.
 */
export function SitesView() {
  const t = useTranslations("sites");
  const router = useRouter();
  const session = useSessionUser();
  const { workspace } = useShell();
  const sites = useSites(workspace?.work_space_id);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h1 text-fg">
          {session?.firstName ? t("welcomeName", { name: session.firstName }) : t("welcome")}
        </h1>
        <p className="text-body-lg text-fg-2">{t("subtitle")}</p>
      </div>

      <section
        aria-labelledby="workspace-sites"
        className="flex flex-col gap-5 rounded-2xl border border-border bg-surface-2/50 p-4 sm:p-8"
      >
        <div className="flex items-center justify-between gap-3">
          {workspace ? (
            <h2 id="workspace-sites" className="truncate text-h2 text-fg">
              {workspace.workspace.name}
            </h2>
          ) : (
            <Skeleton className="h-7 w-40" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("workspaceMenu")}>
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => router.push(NEW_SITE_PATH)}>
                <PlusIcon />
                {t("addSite")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push(accountHref.settings("workspaces"))}>
                <SettingsIcon />
                {t("workspaceSettings")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(accountHref.settings("team-members"))}>
                <UsersIcon />
                {t("teamMembers")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {sites.isPending ? (
          <ul className="flex flex-col gap-3" aria-busy>
            {[0, 1].map((i) => (
              <li key={i}>
                <Skeleton className="h-[132px] w-full rounded-xl" />
              </li>
            ))}
          </ul>
        ) : sites.isError ? (
          <div className="flex flex-col items-start gap-3 rounded-xl bg-surface p-6">
            <p className="text-body-lg text-fg">{t("error")}</p>
            <Button variant="secondary" onClick={() => void sites.refetch()}>
              {t("retry")}
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sites.data.map((site) => (
              <li key={site.id}>
                <SiteRow site={site} workspaceId={String(workspace?.work_space_id ?? "")} />
              </li>
            ))}
            <li>
              <Link
                href={NEW_SITE_PATH}
                className="flex min-h-20 items-center gap-4 rounded-xl border border-dashed border-border-strong px-6 py-5 text-fg-2 transition-colors hover:border-fg-3 hover:bg-surface hover:text-fg"
              >
                <span className="grid size-11 place-items-center rounded-lg bg-surface text-fg">
                  <PlusIcon aria-hidden className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-h3 text-fg">{t("addSite")}</span>
                  <span className="text-small text-fg-3">
                    {sites.data.length === 0 ? t("emptyBody") : t("addSiteBody")}
                  </span>
                </span>
              </Link>
            </li>
          </ul>
        )}
      </section>
    </div>
  );
}

function SiteRow({ site, workspaceId }: { site: Site; workspaceId: string }) {
  const t = useTranslations("sites");
  const format = useFormatter();
  const setupStep = useSetupStep(site.id);
  const { stats } = useSiteStats(site.id);
  const inSetup = Boolean(setupStep);
  const href = setupStep ? setupPath(site.id, setupStep) : `/${siteSlug(site)}/overview`;

  return (
    <Link
      href={href}
      onClick={() => {
        const ui = useUiStore.getState();
        ui.setWorkspace(workspaceId);
        if (!inSetup) ui.setBrand(siteSlug(site));
      }}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-5 rounded-xl border border-border bg-surface p-5 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-raised sm:p-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <SiteFavicon src={faviconFor(site.domain)} name={site.name} size={48} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-h2 text-fg">{site.name}</span>
          <span dir="ltr" className="truncate text-start text-small text-fg-3">
            {site.domain}
          </span>
        </span>
      </div>

      <ChevronRightIcon
        aria-hidden
        className="size-5 text-fg-3 transition-transform group-hover:translate-x-0.5 md:order-last rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
      />

      <div className="flex flex-col gap-0.5">
        <span className="num text-h2 text-fg">
          {stats.clustersCovered}
          <span className="text-small font-normal text-fg-3"> / {stats.clustersTotal}</span>
        </span>
        <span className="text-small text-fg-3">{t("clusters")}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="num text-h2 text-fg">
          {stats.visibility === null ? "—" : format.number(stats.visibility, "integer")}
        </span>
        <span className="text-small text-fg-3">{t("visibility")}</span>
      </div>

      <div className="col-span-full -mt-1">
        {inSetup && setupStep ? (
          <Badge variant="warning" shape="pill">
            {t("setupIncomplete", { step: stepNumber(setupStep), total: TOTAL_STEPS })}
          </Badge>
        ) : (
          <Badge variant="success" shape="pill">
            {t("active")}
          </Badge>
        )}
      </div>
    </Link>
  );
}
