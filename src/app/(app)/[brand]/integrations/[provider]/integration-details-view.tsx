"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon, PlugIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDERS, type IntegrationProvider } from "@/features/integrations/catalog";
import { useProviderAccounts, type ProviderAccount } from "@/features/integrations/connections";
import { useTestConnection } from "@/features/publishing/hooks";
import { useSyncGsc } from "@/features/search-console/hooks";
import { workspaceRole } from "@/features/workspace/hooks";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { EmptyState } from "@/components/brand/empty-state";
import { IntegrationStatusBadge, IntegrationTile } from "@/components/brand/integration-row";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Connected accounts for one provider. Publishing connections can be
 * re-tested and Search Console re-synced through the backend. The backend has
 * no endpoint to remove a connection, so there is no Disconnect here.
 */
export function IntegrationDetailsView({ provider }: { provider: IntegrationProvider }) {
  const t = useTranslations("integrations");
  const format = useFormatter();
  const { brandSlug, brand, workspace } = useShell();
  const { accounts: byProvider } = useProviderAccounts(brand?.id, brandSlug);
  const testConnection = useTestConnection(brand?.id ?? 0);
  const syncGsc = useSyncGsc(brand?.id ?? 0);
  const accounts = byProvider[provider];
  const meta = PROVIDERS[provider];
  const name = t(`providers.${provider}.name`);
  const canConnect = workspaceRole(workspace) !== "viewer";
  // Search Console holds one property per site.
  const canAddAnother = canConnect && provider !== "searchConsole" && !(meta.scope === "user" && accounts.length > 0);

  const [connecting, setConnecting] = React.useState(false);
  function handleTest(account: ProviderAccount) {
    if (!account.connectionId) return;
    testConnection.mutate(account.connectionId, {
      onSuccess: (result) =>
        result.success
          ? toast.success(result.message)
          : toast.error(t("errors.testFailed", { message: result.message })),
      onError: (error) => toast.error(getErrorMessage(error, t("errors.connectFailed"))),
    });
  }

  function handleSync() {
    syncGsc.mutate(undefined, {
      onSuccess: (result) => toast.success(t("toasts.synced", { rows: result.rows_processed })),
      onError: (error) => toast.error(getErrorMessage(error, t("errors.syncFailed"))),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={brandHref(brandSlug, "integrations")} aria-label={t("back")}>
            <ChevronLeftIcon className="rtl:-scale-x-100" />
          </Link>
        </Button>
        <IntegrationTile monogram={meta.monogram} logo={provider} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-h1 text-fg">{name}</h1>
          <p className="text-body text-fg-2">{t(`providers.${provider}.description`)}</p>
        </div>
        {canAddAnother && accounts.length > 0 && (
          <Button variant="primary" onClick={() => setConnecting(true)}>
            <PlusIcon />
            {t("addAnother")}
          </Button>
        )}
      </header>

      {accounts.length === 0 ? (
        <EmptyState
          icon={PlugIcon}
          title={t("details.emptyTitle", { name })}
          description={t("details.emptyBody")}
          action={
            canConnect ? (
              <Button variant="primary" onClick={() => setConnecting(true)}>
                {t("connect")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {accounts.map((account) => (
            <li key={account.id} id={account.id}>
              <Card className="flex-row flex-wrap items-center gap-4">
                <IntegrationTile monogram={meta.monogram} logo={provider} />
                <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p dir="auto" className="truncate text-body font-medium text-fg">
                      {account.name}
                    </p>
                    {account.status && (
                      <IntegrationStatusBadge
                        status={
                          account.status === "active"
                            ? "connected"
                            : account.status === "pending"
                              ? "connecting"
                              : "notConnected"
                        }
                      />
                    )}
                  </div>
                  <p className="text-caption font-normal text-fg-3">
                    {[
                      account.detail,
                      meta.scope === "user" ? t("details.allBrands") : null,
                      t("details.connectedOn", { date: format.dateTime(new Date(account.connectedAt), "medium") }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {account.lastError && account.status !== "active" && (
                    <p className="text-caption font-normal text-danger">{account.lastError}</p>
                  )}
                </div>
                {canConnect && (
                  <div className="flex items-center gap-2">
                    {account.connectionId !== undefined && (
                      <Button
                        size="sm"
                        loading={testConnection.isPending && testConnection.variables === account.connectionId}
                        onClick={() => handleTest(account)}
                      >
                        <RefreshCwIcon />
                        {t("details.test")}
                      </Button>
                    )}
                    {provider === "searchConsole" && (
                      <Button size="sm" loading={syncGsc.isPending} onClick={handleSync}>
                        <RefreshCwIcon />
                        {t("details.sync")}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConnectDialog
        provider={connecting ? provider : null}
        site={brand}
        brandSlug={brandSlug}
        workspaceId={workspace ? String(workspace.work_space_id) : null}
        onOpenChange={setConnecting}
      />
    </div>
  );
}
