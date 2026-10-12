"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRightIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { engines, type Engine } from "@/types/types";
import { toast } from "@/lib/toast";
import {
  INTEGRATION_CATEGORIES,
  PROVIDERS,
  providersIn,
  type IntegrationCategory,
  type IntegrationProvider,
} from "@/features/integrations/catalog";
import { useTrackedEngines } from "@/features/integrations/store";
import { useProviderAccounts, type ProviderAccount } from "@/features/integrations/connections";
import { workspaceRole } from "@/features/workspace/hooks";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { IntegrationRow } from "@/components/brand/integration-row";
import { engineMonogram } from "@/components/brand/engine-icon";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { useShell } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NO_PAUSED: Engine[] = [];

/** Every tool Rankoya can work with for this brand, split into tabs by what it's for. */
export function IntegrationsView() {
  const t = useTranslations("integrations");
  const { brandSlug, brand, workspace } = useShell();
  const { accounts, isConnected } = useProviderAccounts(brand?.id, brandSlug);
  const paused = useTrackedEngines((s) => s.paused[brandSlug] ?? NO_PAUSED);
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(INTEGRATION_CATEGORIES).withDefault("ai"));
  const [connecting, setConnecting] = React.useState<IntegrationProvider | null>(null);
  // Viewers can see integrations but not change them.
  const canConnect = workspaceRole(workspace) !== "viewer";

  /** Active / total for each tab: engines being tracked, or providers with a connection. */
  const counts = (category: IntegrationCategory) => {
    if (category === "ai") return { active: engines.length - paused.length, total: engines.length };
    const providers = providersIn(category);
    const active = providers.filter(isConnected).length;
    return { active, total: providers.length };
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

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
                <EngineRows brandSlug={brandSlug} paused={paused} canEdit={canConnect} />
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

/** The AI engines Rankoya asks questions in. Switched on and off, not connected. */
function EngineRows({ brandSlug, paused, canEdit }: { brandSlug: string; paused: Engine[]; canEdit: boolean }) {
  const t = useTranslations("integrations");
  const tEngine = useTranslations("engines");
  const setTracked = useTrackedEngines((s) => s.setTracked);

  return engines.map((engine) => {
    const tracked = !paused.includes(engine);
    const name = tEngine(engine);
    const toggle = (
      <Switch
        checked={tracked}
        disabled={!canEdit}
        aria-label={t("trackToggle", { name })}
        onCheckedChange={(next) => {
          setTracked(brandSlug, engine, next);
          toast.success(next ? t("toasts.trackingOn", { name }) : t("toasts.trackingOff", { name }));
        }}
      />
    );

    return (
      <li key={engine} className="flex">
        <IntegrationRow
          className="w-full"
          monogram={engineMonogram[engine]}
          logo={engine}
          name={name}
          description={t(`engines.${engine}`)}
          status={tracked ? "tracking" : "paused"}
          action={
            canEdit ? (
              toggle
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{toggle}</span>
                </TooltipTrigger>
                <TooltipContent>{t("viewerNote")}</TooltipContent>
              </Tooltip>
            )
          }
        />
      </li>
    );
  });
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
