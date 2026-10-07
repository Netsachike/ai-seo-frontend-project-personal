"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRightIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { INTEGRATION_PROVIDERS, PROVIDERS, type IntegrationProvider } from "@/features/integrations/catalog";
import { connectionsFor, useIntegrations } from "@/features/integrations/store";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { IntegrationRow } from "@/components/brand/integration-row";
import { brandHref } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { useShell } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const GROUPS: Array<{ key: "talk" | "publish" | "measure"; providers: IntegrationProvider[] }> = [
  { key: "talk", providers: ["telegram"] },
  { key: "publish", providers: ["wordpress", "shopify", "webflow"] },
  { key: "measure", providers: ["searchConsole", "analytics"] },
];

/** Every tool Orbit can work with for this brand, its status, and how to connect it. */
export function IntegrationsView() {
  const t = useTranslations("integrations");
  const { brandSlug, workspace } = useShell();
  const connections = useIntegrations((s) => s.connections);
  const [connecting, setConnecting] = React.useState<IntegrationProvider | null>(null);
  // Viewers can see integrations but not change them.
  const canConnect = workspace?.role !== "viewer";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("description")} />

      {GROUPS.map((group) => (
        <section key={group.key} className="flex flex-col gap-3" aria-labelledby={`int-${group.key}`}>
          <h2 id={`int-${group.key}`} className="text-overline text-fg-2">
            {t(`groups.${group.key}`)}
          </h2>
          <ul className="flex flex-col gap-3">
            {group.providers
              .filter((provider) => INTEGRATION_PROVIDERS.includes(provider))
              .map((provider) => {
                const meta = PROVIDERS[provider];
                const accounts = connectionsFor(connections, provider, brandSlug);
                const status = meta.soon ? "comingSoon" : accounts.length > 0 ? "connected" : "notConnected";
                const name = t(`providers.${provider}.name`);

                const connectButton = (
                  <Button
                    size="sm"
                    variant={accounts.length > 0 ? "secondary" : "primary"}
                    disabled={!canConnect}
                    onClick={() => setConnecting(provider)}
                  >
                    {accounts.length > 0 ? <PlusIcon /> : null}
                    {accounts.length > 0 ? t("addAnother") : t("connect")}
                  </Button>
                );

                return (
                  <li key={provider} className="flex">
                    <IntegrationRow
                      className="w-full"
                      monogram={meta.monogram}
                      name={name}
                      description={t(`providers.${provider}.description`)}
                      status={status}
                      detail={
                        accounts.length > 0
                          ? t("connectedAccounts", { count: accounts.length, first: accounts[0].account.name })
                          : meta.soon
                            ? t("soonDetail")
                            : undefined
                      }
                      action={
                        meta.soon ? null : (
                          <>
                            {accounts.length > 0 && (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={brandHref(brandSlug, `integrations/${provider}`)}>
                                  {t("manage")}
                                  <ArrowUpRightIcon className="rtl:-scale-x-100" />
                                </Link>
                              </Button>
                            )}
                            {meta.scope === "user" && accounts.length > 0 ? null : canConnect ? (
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
              })}
          </ul>
        </section>
      ))}

      <ConnectDialog
        provider={connecting}
        brandSlug={brandSlug}
        workspaceId={workspace?.id ?? null}
        onOpenChange={(open) => {
          if (!open) setConnecting(null);
        }}
      />
    </div>
  );
}
