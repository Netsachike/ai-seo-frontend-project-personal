"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, ExternalLinkIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/toast";
import { fakeRequest } from "@/lib/auth/session";
import { mentionsUpgrade } from "@/lib/errors";
import { accountHref } from "@/features/account/routes";
import {
  INTEGRATION_CONNECTED_MESSAGE,
  PROVIDERS,
  oauthSelectUrl,
  type IntegrationConnectedMessage,
  type IntegrationProvider,
} from "@/features/integrations/catalog";
import { useIntegrations } from "@/features/integrations/store";
import { DomainInput, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { IntegrationTile } from "@/components/brand/integration-row";
import { QrTile } from "@/components/brand/qr-tile";
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

/** UI-stage Telegram link token; the backend will issue one per user. */
const LINK_CODE = "ORB-7K2Q-NW";
const DEEP_LINK = `https://t.me/OrbitAgentBot?start=${LINK_CODE.replaceAll("-", "")}`;

/**
 * Connects one provider. OAuth providers open the consent flow in a popup,
 * which reports back with a `postMessage` (the popup's close is polled as a
 * fallback); WordPress uses a credentials form; Telegram a chat link code.
 */
export function ConnectDialog({
  provider,
  brandSlug,
  workspaceId,
  onOpenChange,
  onConnected,
}: {
  provider: IntegrationProvider | null;
  brandSlug: string;
  workspaceId: string | null;
  onOpenChange: (open: boolean) => void;
  onConnected?: (provider: IntegrationProvider) => void;
}) {
  const t = useTranslations("integrations");
  const router = useRouter();
  const connect = useIntegrations((s) => s.connect);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isWaiting, setIsWaiting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wp, setWp] = React.useState({ siteUrl: "", username: "", appPassword: "" });
  const popupRef = React.useRef<Window | null>(null);
  const pollRef = React.useRef<number | null>(null);

  const meta = provider ? PROVIDERS[provider] : null;
  const name = provider ? t(`providers.${provider}.name`) : "";

  // Reset the form whenever a different provider opens.
  const [openFor, setOpenFor] = React.useState<IntegrationProvider | null>(null);
  if (provider !== openFor) {
    setOpenFor(provider);
    setError(null);
    setIsWaiting(false);
    setWp({ siteUrl: "", username: "", appPassword: "" });
  }

  const cleanupPopup = React.useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    popupRef.current = null;
    setIsWaiting(false);
  }, []);

  React.useEffect(() => cleanupPopup, [cleanupPopup]);

  // The /integrations/[provider]/select page posts this when the account is connected.
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent<IntegrationConnectedMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== INTEGRATION_CONNECTED_MESSAGE || event.data.provider !== provider) return;
      cleanupPopup();
      if (event.data.error) {
        if (mentionsUpgrade(event.data.error)) router.push(accountHref.upgrade());
        else setError(event.data.error);
        return;
      }
      connect({
        provider: event.data.provider,
        brandSlug: PROVIDERS[event.data.provider].scope === "user" ? null : (event.data.brand ?? brandSlug),
        account: event.data.account ?? { name: brandSlug, detail: "" },
      });
      toast.success(t("toasts.connected", { name }));
      onConnected?.(event.data.provider);
      onOpenChange(false);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [provider, brandSlug, cleanupPopup, connect, name, onConnected, onOpenChange, router, t]);

  const handleOAuthConnect = () => {
    if (!provider) return;
    setError(null);
    // No noopener: the callback page needs window.opener to report back, and
    // the handle is needed to poll for close.
    const popup = window.open(
      oauthSelectUrl(provider, { workspaceId, brand: brandSlug }),
      "orbit-oauth",
      "width=520,height=720",
    );
    if (!popup) {
      setError(t("errors.popupBlocked"));
      return;
    }
    popupRef.current = popup;
    setIsWaiting(true);
    pollRef.current = window.setInterval(() => {
      // Closed (completed or cancelled): stop waiting. Success arrives by postMessage.
      if (popupRef.current?.closed) cleanupPopup();
    }, 700);
  };

  const handleManualConnect = async () => {
    const siteUrl = wp.siteUrl.trim();
    const username = wp.username.trim();
    const appPassword = wp.appPassword.trim();
    if (!siteUrl || !username || !appPassword) {
      setError(t("errors.wordpressRequired"));
      return;
    }
    setIsConnecting(true);
    setError(null);
    await fakeRequest(1200);
    const created = connect({ provider: "wordpress", brandSlug, account: { name: siteUrl, detail: username } });
    setIsConnecting(false);
    toast.success(t("toasts.connected", { name }));
    onConnected?.("wordpress");
    onOpenChange(false);
    router.push(`/${brandSlug}/integrations/wordpress#${created.id}`);
  };

  const handleTelegramConnect = async () => {
    setIsConnecting(true);
    await fakeRequest(1500);
    connect({ provider: "telegram", brandSlug: null, account: { name: "@fvo_northwind", detail: t("providers.telegram.chat") } });
    setIsConnecting(false);
    toast.success(t("toasts.connected", { name }));
    onConnected?.("telegram");
    onOpenChange(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(LINK_CODE);
      toast.success(t("telegram.copied"));
    } catch {
      toast.error(t("telegram.copyFailed"));
    }
  };

  return (
    <Dialog
      open={Boolean(provider)}
      onOpenChange={(open) => {
        if (!open) cleanupPopup();
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-[520px]">
        {provider && meta && (
          <>
            <DialogHeader className="flex-row items-center gap-3">
              <IntegrationTile monogram={meta.monogram} />
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

            {meta.method === "manual" && (
              <form
                id="connect-manual"
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleManualConnect();
                }}
              >
                <FormField label={t("wordpress.siteUrl")}>
                  {(props) => (
                    <DomainInput
                      {...props}
                      value={wp.siteUrl}
                      placeholder={t("wordpress.siteUrlPlaceholder")}
                      onChange={(siteUrl) => setWp((prev) => ({ ...prev, siteUrl }))}
                    />
                  )}
                </FormField>
                <FormField label={t("wordpress.username")}>
                  {(props) => (
                    <Input
                      {...props}
                      dir="ltr"
                      autoComplete="off"
                      value={wp.username}
                      onChange={(event) => setWp((prev) => ({ ...prev, username: event.target.value }))}
                    />
                  )}
                </FormField>
                <FormField label={t("wordpress.appPassword")} helper={t("wordpress.appPasswordHelper")}>
                  {(props) => (
                    <PasswordInput
                      {...props}
                      dir="ltr"
                      autoComplete="off"
                      value={wp.appPassword}
                      onChange={(event) => setWp((prev) => ({ ...prev, appPassword: event.target.value }))}
                    />
                  )}
                </FormField>
              </form>
            )}

            {meta.method === "code" && (
              <div className="flex flex-col gap-5 rounded-md bg-bg p-4 sm:flex-row sm:items-center">
                <QrTile value={DEEP_LINK} label={t("telegram.qrLabel")} size={128} />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <ol className="flex list-decimal flex-col gap-1 ps-5 text-small text-fg-2">
                    <li>{t("telegram.step1")}</li>
                    <li>{t("telegram.step2")}</li>
                  </ol>
                  <div className="flex items-center gap-2">
                    <code dir="ltr" className="rounded-sm bg-surface px-2 py-1 font-mono text-small text-fg">
                      {LINK_CODE}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("telegram.copyAria", { code: LINK_CODE })}
                      onClick={() => void copyCode()}
                    >
                      <CopyIcon />
                    </Button>
                  </div>
                  <Button asChild size="sm" className="w-fit">
                    <a href={DEEP_LINK} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon />
                      {t("telegram.open")}
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {meta.method === "oauth" && (
              <p className="flex items-start gap-2 rounded-md bg-bg p-3 text-small text-fg-2">
                <ShieldCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                {t("oauthNote")}
              </p>
            )}

            {isWaiting && (
              <p role="status" className="flex items-center gap-2 text-small text-fg-2">
                <Loader2Icon aria-hidden className="size-4 animate-spin" />
                {t("waiting")}
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
                <Button variant="primary" loading={isWaiting} onClick={handleOAuthConnect}>
                  {t("continueWith", { name })}
                </Button>
              )}
              {meta.method === "manual" && (
                <Button type="submit" form="connect-manual" variant="primary" loading={isConnecting}>
                  {t("connect")}
                </Button>
              )}
              {meta.method === "code" && (
                <Button variant="primary" loading={isConnecting} onClick={() => void handleTelegramConnect()}>
                  {t("telegram.pressedStart")}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
