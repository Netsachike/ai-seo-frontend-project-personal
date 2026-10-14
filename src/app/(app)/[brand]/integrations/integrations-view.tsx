"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRightIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PLATFORMS, type Platform, type Site } from "@/types/types";
import { siteKeys } from "@/lib/api/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import siteService from "@/services/sites";
import { TESTED_ENGINES } from "@/features/visibility/model";
import {
  INTEGRATION_CATEGORIES,
  PROVIDERS,
  providersIn,
  type IntegrationCategory,
  type IntegrationProvider,
} from "@/features/integrations/catalog";
import { useProviderAccounts, type ProviderAccount } from "@/features/integrations/connections";
import { workspaceRole } from "@/features/workspace/hooks";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { IntegrationRow } from "@/components/brand/integration-row";
import { engineMonogram } from "@/components/brand/engine-icon";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { useShell } from "@/components/layout/shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Every tool Rankoya can work with for this brand, split into tabs by what it's for. */
export function IntegrationsView() {
  const t = useTranslations("integrations");
  const { brandSlug, brand, workspace } = useShell();
  const { accounts, isConnected } = useProviderAccounts(brand?.id, brandSlug);
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(INTEGRATION_CATEGORIES).withDefault("ai"));
  const [connecting, setConnecting] = React.useState<IntegrationProvider | null>(null);
  // Viewers can see integrations but not change them.
  const canConnect = workspaceRole(workspace) !== "viewer";

  /** Active / total for each tab: engines being tracked, or providers with a connection. */
  const counts = (category: IntegrationCategory) => {
    if (category === "ai") return { active: TESTED_ENGINES.length, total: TESTED_ENGINES.length };
    const providers = providersIn(category);
    const active = providers.filter(isConnected).length;
    return { active, total: providers.length };
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {brand && <PlatformCard site={brand} canEdit={canConnect} />}

      <Tabs value={tab} onValueChange={(value) => setTab(value as IntegrationCategory)}>
        <TabsList aria-label={t("tabsLabel")}>
          {INTEGRATION_CATEGORIES.map((category) => {
            const { active, total } = counts(category);
            return (
              <TabsTrigger key={category} value={category}>
                {t(`tabs.${category}`)}
                <span className="rounded-sm bg-surface-2 px-1.5 num text-caption font-medium text-fg-3">
                  {t("tabCount", { active, total })}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {INTEGRATION_CATEGORIES.map((category) => (
          <TabsContent key={category} value={category} className="flex flex-col gap-4">
            <p className="max-w-[640px] text-small text-fg-2">{t(`tabIntro.${category}`)}</p>
            <ul className="grid gap-3 lg:grid-cols-2">
              {category === "ai" ? (
                <EngineRows />
              ) : (
                providersIn(category).map((provider) => (
                  <ProviderRow
                    key={provider}
                    provider={provider}
                    brandSlug={brandSlug}
                    accounts={accounts[provider]}
                    canConnect={canConnect}
                    onConnect={() => setConnecting(provider)}
                  />
                ))
              )}
            </ul>
          </TabsContent>
        ))}
      </Tabs>

      <ConnectDialog
        provider={connecting}
        site={brand}
        brandSlug={brandSlug}
        workspaceId={workspace ? String(workspace.work_space_id) : null}
        onOpenChange={(open) => {
          if (!open) setConnecting(null);
        }}
      />
    </div>
  );
}

/** The AI assistants every visibility scan asks. The backend tests all of them; there is nothing to switch. */
function EngineRows() {
  const t = useTranslations("integrations");
  const tEngine = useTranslations("engines");
  return TESTED_ENGINES.map((engine) => (
    <li key={engine} className="flex">
      <IntegrationRow
        className="w-full"
        monogram={engineMonogram[engine]}
        logo={engine}
        name={tEngine(engine)}
        description={t(`engines.${engine}`)}
        status="tracking"
      />
    </li>
  ));
}

/** The CMS the site runs on: detected by the crawl, confirmed or changed here. */
function PlatformCard({ site, canEdit }: { site: Site; canEdit: boolean }) {
  const t = useTranslations("integrations.platform");
  const queryClient = useQueryClient();
  const current = (PLATFORMS as readonly string[]).includes(site.platform.name)
    ? (site.platform.name as Platform)
    : "unknown";
  const [value, setValue] = React.useState<Platform>(current);
  const save = useMutation({
    mutationFn: (platform: Platform) => siteService.confirmPlatform(site.id, platform),
    onSuccess: () => {
      toast.success(t("saved"));
      return queryClient.invalidateQueries({ queryKey: siteKeys.detail(site.id) });
    },
    onError: (error) => toast.error(getErrorMessage(error, t("failed"))),
  });
  return (
    <Card className="flex-row flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{t("title")}</CardTitle>
          <Badge variant={site.platform.detected ? "blue" : "success"}>
            {site.platform.detected
              ? site.platform.confidence !== null
                ? t("detectedConfidence", {
                    confidence: Math.round(site.platform.confidence * (site.platform.confidence <= 1 ? 100 : 1)),
                  })
                : t("detected")
              : t("confirmed")}
          </Badge>
        </div>
        <CardDescription>{t("body")}</CardDescription>
      </div>
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={(v) => setValue(v as Platform)} disabled={!canEdit}>
          <SelectTrigger aria-label={t("label")} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((platform) => (
              <SelectItem key={platform} value={platform}>
                {t(`names.${platform}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="primary"
          size="sm"
          disabled={!canEdit}
          loading={save.isPending}
          onClick={() => save.mutate(value)}
        >
          {site.platform.detected && value === current ? t("confirm") : t("save")}
        </Button>
      </div>
    </Card>
  );
}

function ProviderRow({
  provider,
  brandSlug,
  accounts,
  canConnect,
  onConnect,
}: {
  provider: IntegrationProvider;
  brandSlug: string;
  accounts: ProviderAccount[];
  canConnect: boolean;
  onConnect: () => void;
}) {
  const t = useTranslations("integrations");
  const meta = PROVIDERS[provider];
  const connected = accounts.length > 0;
  const status = meta.soon ? "comingSoon" : connected ? "connected" : "notConnected";

  const connectButton = (
    <Button size="sm" variant={connected ? "secondary" : "primary"} disabled={!canConnect} onClick={onConnect}>
      {connected ? <PlusIcon /> : null}
      {connected ? t("addAnother") : t("connect")}
    </Button>
  );

  return (
    <li className="flex">
      <IntegrationRow
        className="w-full"
        monogram={meta.monogram}
        logo={provider}
        name={t(`providers.${provider}.name`)}
        description={t(`providers.${provider}.description`)}
        status={status}
        detail={
          connected
            ? t("connectedAccounts", { count: accounts.length, first: accounts[0].name })
            : meta.soon
              ? t("soonDetail")
              : undefined
        }
        action={
          meta.soon ? null : (
            <>
              {connected && (
                <Button asChild size="sm" variant="ghost">
                  <Link href={brandHref(brandSlug, `integrations/${provider}`)}>
                    {t("manage")}
                    <ArrowUpRightIcon className="rtl:-scale-x-100" />
                  </Link>
                </Button>
              )}
              {meta.scope === "user" && connected ? null : canConnect ? (
                connectButton
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>{connectButton}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("viewerNote")}</TooltipContent>
                </Tooltip>
              )}
            </>
          )
        }
      />
    </li>
  );
}
