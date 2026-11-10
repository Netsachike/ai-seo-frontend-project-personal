"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { useQueryClient } from "@tanstack/react-query";

import type { Site } from "@/types/types";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { publishingKeys } from "@/lib/api/query-keys";
import { PROVIDERS, type IntegrationProvider } from "@/features/integrations/catalog";
import { PUBLISHING_FIELDS, connectionPayload, isPublishingPlatform } from "@/features/publishing/forms";
import { ConnectionTestError, useCreateConnection } from "@/features/publishing/hooks";
import { startWpcomConnect } from "@/features/publishing/wpcom";
import { ShopifyBlogPicker } from "@/features/publishing/shopify-blog-picker";
import { ShopifyTokenGenerator } from "@/features/publishing/shopify-token-generator";
import { startGscConnect } from "@/features/search-console/hooks";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { IntegrationTile } from "@/components/brand/integration-row";
import { ConnectGuide } from "./connect-guide";
import { FeedLinks } from "./feed-links";
import { WebhookConnect } from "./webhook-connect";
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

/** Wix callback error codes (`?error=wix_<code>`) that have their own message. */
const WIX_ERRORS = ["cancelled", "signature", "token", "no_blog", "not_configured", "state", "site", "save"] as const;
type WixError = (typeof WIX_ERRORS)[number];
/**
 * Finishes redirect flows that come back to this page: `?connected=<provider>`
 * or `?error=<provider>_<code>`. Shows a toast once, refreshes the
 * connections, then strips the params.
 */
export function useConnectReturn(siteId: number | undefined, onConnected?: (provider: IntegrationProvider) => void) {
  const t = useTranslations("integrations");
  const queryClient = useQueryClient();
  const [connected, setConnected] = useQueryState("connected");
  const [error, setError] = useQueryState("error");
  // Each param is handled once, even if the effect re-runs before the URL updates.
  const handled = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (connected !== "wix" || !siteId || handled.current === `c:${connected}`) return;
    handled.current = `c:${connected}`;
    toast.success(t("toasts.connected", { name: t("providers.wix.name") }));
    void queryClient.invalidateQueries({ queryKey: publishingKeys.all(siteId) });
    onConnected?.("wix");
    void setConnected(null);
  }, [connected, siteId, t, queryClient, onConnected, setConnected]);

  React.useEffect(() => {
    if (!error?.startsWith("wix_") || handled.current === `e:${error}`) return;
    handled.current = `e:${error}`;
    const code = error.slice(4);
    toast.error(t(`wixApp.errors.${(WIX_ERRORS as readonly string[]).includes(code) ? (code as WixError) : "save"}`));
    void setError(null);
  }, [error, t, setError]);
}

/**
 * Connects one provider for the open site:
 * - publishing platforms: a credentials form, created and tested through the backend;
 * - Search Console: the backend's Google OAuth redirect;
 * - WordPress.com: the backend's OAuth redirect; the site is picked back on its details page;
 * - copy and paste (Next.js, any other site): a `manual` connection, nothing to fill in;
 * - Wix: installing Rankoya's Wix app (/api/integrations/wix/start); the API-key form is off for now;
 * - Make, Lovable, Replit: a webhook URL, sent a signed test article before it's saved;
 * - RSS: the site's signed feed links to copy; nothing is saved.
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
  // Shopify: once connected, the blog articles go to is chosen before closing.
  const [shopifyConnection, setShopifyConnection] = React.useState<number | null>(null);
  useConnectReturn(site?.id, onConnected);

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
    setShopifyConnection(null);
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
      } else if (provider === "wix") {
        // A plain navigation: the route sets the signed state cookie and sends the user on to Wix.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a route handler, not a page
        window.location.assign(`/api/integrations/wix/start?site=${site.id}&returnTo=${encodeURIComponent(pathname)}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, t("errors.connectFailed")));
      setIsWaiting(false);
    }
  };

  const handleManualConnect = () => {
    if (!provider || !site) return;
    setError(null);
    createConnection.mutate(
      { name, platform: provider === "nextjs" ? "nextjs" : "custom", method: "manual" },
      {
        onSuccess: () => {
          toast.success(t("toasts.connected", { name }));
          onConnected?.(provider);
          onOpenChange(false);
        },
        onError: (err) => setError(getErrorMessage(err, t("errors.connectFailed"))),
      },
    );
  };

  const handleCredentialsConnect = async () => {
    if (!provider || !isPublishingPlatform(provider) || !site) return;
    if (fields.some((field) => !(values[field.key] ?? "").trim())) {
      setError(t("errors.fieldsRequired"));
      return;
    }
    setError(null);
    const payload = connectionPayload(provider, `${name} · ${site.domain}`, values);
    createConnection.mutate(payload, {
      onSuccess: (connectionId) => {
        toast.success(t("toasts.connected", { name }));
        onConnected?.(provider);
        if (provider === "shopify") setShopifyConnection(connectionId);
        else onOpenChange(false);
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
      <DialogContent className="max-h-[90dvh] max-w-[560px] overflow-y-auto">
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

            {shopifyConnection !== null && site && (
              <div className="flex flex-col gap-2 rounded-md border border-success bg-success-bg/40 p-4">
                <p className="text-small font-semibold text-fg">{t("shopifyBlogs.chooseTitle")}</p>
                <p className="text-small text-fg-2">{t("shopifyBlogs.chooseBody")}</p>
                <ShopifyBlogPicker
                  siteId={site.id}
                  connectionId={shopifyConnection}
                  onSaved={() => onOpenChange(false)}
                />
              </div>
            )}

            {/* Wix: the API-key form is off for now; the footer button installs Rankoya's Wix app.
            {provider === "wix" && site && ( … "Install on Wix" card with an API-key fallback … )} */}

            {shopifyConnection === null && <ConnectGuide provider={provider} defaultOpen={meta.method !== "webhook"} />}

            {meta.method === "webhook" &&
              site &&
              (provider === "make" || provider === "lovable" || provider === "replit") && (
                <WebhookConnect
                  provider={provider}
                  site={site}
                  name={name}
                  onSaved={() => {
                    onConnected?.(provider);
                    onOpenChange(false);
                  }}
                />
              )}

            {meta.method === "feed" && site && <FeedLinks siteId={site.id} />}

            {provider === "shopify" && shopifyConnection === null && (
              <ShopifyTokenGenerator
                onToken={(token) =>
                  setValues((prev) => ({ ...prev, store_domain: token.storeDomain, access_token: token.accessToken }))
                }
              />
            )}

            {meta.method === "credentials" && shopifyConnection === null && (
              <form
                id="connect-credentials"
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCredentialsConnect();
                }}
              >
                {fields.map((field) => {
                  const value = values[field.key] ?? "";
                  const set = (next: string) => setValues((prev) => ({ ...prev, [field.key]: next }));
                  return (
                    <FormField
                      key={field.key}
                      label={t(`fields.${field.label}`)}
                      helper={
                        field.key === "application_password"
                          ? t("wordpress.appPasswordHelper")
                          : provider === "shopify" && field.key === "access_token"
                            ? t("shopifyToken.tokenHelper")
                            : undefined
                      }
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
                {provider === "wix" ? t("wixApp.body") : t("oauthNote")}
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-md bg-danger-bg px-3 py-2.5 text-small text-danger">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                {meta.method === "feed" ? t("feed.done") : t("cancel")}
              </Button>
              {meta.method === "oauth" && (
                <Button variant="primary" loading={isWaiting} onClick={() => void handleOAuthConnect()}>
                  {t("continueWith", { name })}
                </Button>
              )}
              {meta.method === "manual" && (
                <Button variant="primary" loading={createConnection.isPending} onClick={handleManualConnect}>
                  {t("connect")}
                </Button>
              )}
              {meta.method === "credentials" && shopifyConnection === null && (
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
