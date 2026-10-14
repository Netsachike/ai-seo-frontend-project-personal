"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDERS, type IntegrationProvider } from "@/features/integrations/catalog";
import { PUBLISHING_FIELDS, connectionPayload, isPublishingPlatform } from "@/features/publishing/forms";
import { ConnectionTestError, useCreateConnection } from "@/features/publishing/hooks";
import { startWpcomConnect } from "@/features/publishing/wpcom";
import { startGscConnect } from "@/features/search-console/hooks";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { IntegrationTile } from "@/components/brand/integration-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Connects one provider for the open site:
 * - publishing platforms: a credentials form, created and tested through the backend;
 * - Search Console: the backend's Google OAuth redirect;
 * - WordPress.com: the backend's OAuth redirect, finished on /integrations/wordpress-com/callback.
 */
export function ConnectDialog({
  provider,
  site,
  onOpenChange,
  onConnected,
}: {
  provider: IntegrationProvider | null;
  site: Site | undefined;
  brandSlug: string;
  workspaceId: string | null;
  onOpenChange: (open: boolean) => void;
  onConnected?: (provider: IntegrationProvider) => void;
}) {
  const t = useTranslations("integrations");
  const pathname = usePathname();
  const createConnection = useCreateConnection(site?.id ?? 0);
  const [isWaiting, setIsWaiting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});

  const meta = provider ? PROVIDERS[provider] : null;
  const name = provider ? t(`providers.${provider}.name`) : "";
  const fields = provider && isPublishingPlatform(provider) ? PUBLISHING_FIELDS[provider] : [];

  // Reset the form whenever a different provider opens.
  const [openFor, setOpenFor] = React.useState<IntegrationProvider | null>(null);
  if (provider !== openFor) {
    setOpenFor(provider);
    setError(null);
    setIsWaiting(false);
    setValues({});
  }

  /** Both OAuth providers leave the app for the provider's consent screen and come back to finish. */
  const handleOAuthConnect = async () => {
    if (!provider || !site) return;
    setError(null);
    setIsWaiting(true);
    try {
      if (provider === "searchConsole") {
        await startGscConnect({ siteId: site.id, domain: site.domain, returnTo: pathname });
      } else if (provider === "wordpressCom") {
        await startWpcomConnect({ siteId: site.id, returnTo: pathname });
      }
    } catch (err) {
      setError(getErrorMessage(err, t("errors.connectFailed")));
      setIsWaiting(false);
    }
  };

  const handleCredentialsConnect = () => {
    if (!provider || !isPublishingPlatform(provider) || !site) return;
    if (fields.some((field) => !(values[field.key] ?? "").trim())) {
      setError(t("errors.fieldsRequired"));
      return;
    }
    setError(null);
    createConnection.mutate(connectionPayload(provider, `${name} · ${site.domain}`, values), {
      onSuccess: () => {
        toast.success(t("toasts.connected", { name }));
        onConnected?.(provider);
        onOpenChange(false);
      },
      onError: (err) => {
        // A failed test keeps the connection (status `error`) so it can be retried from its details page.
        setError(
          err instanceof ConnectionTestError
            ? t("errors.testFailed", { message: err.message })
            : getErrorMessage(err, t("errors.connectFailed")),
        );
      },
    });
  };

  return (
    <Dialog open={Boolean(provider)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        {provider && meta && (
          <>
            <DialogHeader className="flex-row items-center gap-3">
              <IntegrationTile monogram={meta.monogram} logo={provider} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <DialogTitle>{t("connectTitle", { name })}</DialogTitle>
                <DialogDescription>{t(`providers.${provider}.description`)}</DialogDescription>
              </div>
            </DialogHeader>

            <ul className="grid gap-2 sm:grid-cols-3">
              {(["access", "data", "control"] as const).map((fact) => (
                <li key={fact} className="flex flex-col gap-0.5 rounded-md bg-bg p-3">
                  <span className="text-overline text-fg-2">{t(`facts.${fact}`)}</span>
                  <span className="text-small text-fg">{t(`providers.${provider}.facts.${fact}`)}</span>
                </li>
              ))}
            </ul>

            {meta.method === "credentials" && (
              <form
                id="connect-credentials"
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCredentialsConnect();
                }}
              >
                {fields.map((field) => {
                  const value = values[field.key] ?? "";
                  const set = (next: string) => setValues((prev) => ({ ...prev, [field.key]: next }));
                  return (
                    <FormField
                      key={field.key}
                      label={t(`fields.${field.label}`)}
                      helper={field.key === "application_password" ? t("wordpress.appPasswordHelper") : undefined}
                    >
                      {(props) =>
                        field.input === "url" ? (
                          <DomainInput {...props} value={value} placeholder={site?.domain} onChange={set} />
                        ) : field.input === "secret" ? (
                          <PasswordInput
                            {...props}
                            dir="ltr"
                            autoComplete="off"
                            value={value}
                            onChange={(event) => set(event.target.value)}
                          />
                        ) : (
                          <Input
                            {...props}
                            dir="ltr"
                            autoComplete="off"
                            value={value}
                            onChange={(event) => set(event.target.value)}
                          />
                        )
                      }
                    </FormField>
                  );
                })}
              </form>
            )}

            {meta.method === "oauth" && (
              <p className="flex items-start gap-2 rounded-md bg-bg p-3 text-small text-fg-2">
                <ShieldCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                {t("oauthNote")}
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-md bg-danger-bg px-3 py-2.5 text-small text-danger">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              {meta.method === "oauth" && (
                <Button variant="primary" loading={isWaiting} onClick={() => void handleOAuthConnect()}>
                  {t("continueWith", { name })}
                </Button>
              )}
              {meta.method === "credentials" && (
                <Button type="submit" form="connect-credentials" variant="primary" loading={createConnection.isPending}>
                  {t("connect")}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
