"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon, KeyRoundIcon, PlugIcon, PlusIcon, UnplugIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { fakeRequest } from "@/lib/auth/session";
import { PROVIDERS, type IntegrationProvider } from "@/features/integrations/catalog";
import { connectionsFor, useIntegrations, type IntegrationConnection } from "@/features/integrations/store";
import { ConfirmDialog } from "@/components/account/confirm-dialog";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { EmptyState } from "@/components/brand/empty-state";
import { IntegrationTile } from "@/components/brand/integration-row";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { brandHref } from "@/components/layout/nav";
import { useShell } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Connected accounts for one provider: details, credential update and disconnect. */
export function IntegrationDetailsView({ provider }: { provider: IntegrationProvider }) {
  const t = useTranslations("integrations");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { brandSlug, workspace } = useShell();
  const all = useIntegrations((s) => s.connections);
  const disconnect = useIntegrations((s) => s.disconnect);
  const accounts = connectionsFor(all, provider, brandSlug);
  const meta = PROVIDERS[provider];
  const name = t(`providers.${provider}.name`);
  const canConnect = workspace?.role !== "viewer";

  const [connecting, setConnecting] = React.useState(false);
  const [toDisconnect, setToDisconnect] = React.useState<IntegrationConnection | null>(null);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [credentialsFor, setCredentialsFor] = React.useState<IntegrationConnection | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleDisconnect() {
    if (!toDisconnect) return;
    setIsDisconnecting(true);
    await fakeRequest(700);
    disconnect(toDisconnect.id);
    toast.success(t("toasts.disconnected", { name: toDisconnect.account.name }));
    setToDisconnect(null);
    setIsDisconnecting(false);
  }

  async function handleUpdateCredentials(event: React.FormEvent) {
    event.preventDefault();
    if (!newPassword.trim()) {
      toast.error(t("errors.passwordRequired"));
      return;
    }
    setIsSaving(true);
    await fakeRequest(800);
    toast.success(t("toasts.credentialsUpdated"));
    setIsSaving(false);
    setCredentialsFor(null);
    setNewPassword("");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={brandHref(brandSlug, "integrations")} aria-label={t("back")}>
            <ChevronLeftIcon className="rtl:-scale-x-100" />
          </Link>
        </Button>
        <IntegrationTile monogram={meta.monogram} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-h1 text-fg">{name}</h1>
          <p className="text-body text-fg-2">{t(`providers.${provider}.description`)}</p>
        </div>
        {canConnect && !(meta.scope === "user" && accounts.length > 0) && (
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
          {accounts.map((connection) => (
            <li key={connection.id} id={connection.id}>
              <Card className="flex-row flex-wrap items-center gap-4">
                <IntegrationTile monogram={meta.monogram} />
                <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
                  <p dir="auto" className="truncate text-body font-medium text-fg">
                    {connection.account.name}
                  </p>
                  <p className="text-caption font-normal text-fg-3">
                    {[
                      connection.account.detail,
                      connection.brandSlug === null ? t("details.allBrands") : null,
                      t("details.connectedOn", { date: format.dateTime(new Date(connection.connectedAt), "medium") }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {canConnect && (
                  <div className="flex items-center gap-2">
                    {provider === "wordpress" && (
                      <Button size="sm" onClick={() => setCredentialsFor(connection)}>
                        <KeyRoundIcon />
                        {t("details.updatePassword")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger-bg hover:text-danger"
                      onClick={() => setToDisconnect(connection)}
                    >
                      <UnplugIcon />
                      {t("details.disconnect")}
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConnectDialog
        provider={connecting ? provider : null}
        brandSlug={brandSlug}
        workspaceId={workspace?.id ?? null}
        onOpenChange={setConnecting}
      />

      <ConfirmDialog
        open={Boolean(toDisconnect)}
        onOpenChange={(open) => {
          if (!open) setToDisconnect(null);
        }}
        title={t("details.disconnectTitle", { name })}
        description={t(`providers.${provider}.disconnectBody`, { account: toDisconnect?.account.name ?? "" })}
        confirmLabel={t("details.disconnect")}
        isPending={isDisconnecting}
        onConfirm={handleDisconnect}
      />

      <Dialog
        open={Boolean(credentialsFor)}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setCredentialsFor(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent className="max-w-[440px]">
          <form className="flex flex-col gap-5" onSubmit={handleUpdateCredentials}>
            <DialogHeader>
              <DialogTitle>{t("details.updatePasswordTitle")}</DialogTitle>
              <DialogDescription dir="auto">{credentialsFor?.account.name}</DialogDescription>
            </DialogHeader>
            <FormField label={t("wordpress.appPassword")} helper={t("wordpress.appPasswordHelper")}>
              {(props) => (
                <PasswordInput
                  {...props}
                  dir="ltr"
                  autoComplete="off"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              )}
            </FormField>
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={isSaving} onClick={() => setCredentialsFor(null)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" variant="primary" loading={isSaving}>
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
