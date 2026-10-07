"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { fakeRequest } from "@/lib/auth/session";
import { mentionsUpgrade } from "@/lib/errors";
import { accountHref } from "@/features/account/routes";
import {
  INTEGRATION_CONNECTED_MESSAGE,
  PROVIDERS,
  type IntegrationConnectedMessage,
  type IntegrationProvider,
} from "@/features/integrations/catalog";
import { brandsByWorkspace } from "@/lib/mocks/fixtures";
import { IntegrationTile } from "@/components/brand/integration-row";
import { Button } from "@/components/ui/button";

type Choice = { name: string; detail: string };

/** UI stage: the properties a Google account might offer for this brand's domain. */
function choicesFor(provider: IntegrationProvider, brand: string | null): Choice[] {
  const domain = Object.values(brandsByWorkspace)
    .flat()
    .find((b) => b.slug === brand)?.domain ?? "example.com";
  if (provider === "analytics") {
    return [
      { name: `${domain} – GA4`, detail: "Property 312 448 901" },
      { name: `${domain} (staging) – GA4`, detail: "Property 312 448 977" },
    ];
  }
  return [
    { name: `sc-domain:${domain}`, detail: "Domain property" },
    { name: `https://www.${domain}/`, detail: "URL-prefix property" },
  ];
}

function notifyOpener(message: IntegrationConnectedMessage) {
  try {
    if (window.opener && !window.opener.closed) window.opener.postMessage(message, window.location.origin);
  } catch {
    // Detached opener: nothing to tell, just close.
  }
}

export function IntegrationSelectView({
  provider,
  workspaceId,
  brand,
  error,
}: {
  provider: IntegrationProvider;
  workspaceId: string | null;
  brand: string | null;
  error: string | null;
}) {
  const t = useTranslations("integrations.select");
  const tProvider = useTranslations("integrations.providers");
  const name = tProvider(`${provider}.name`);
  const choices = React.useMemo(() => choicesFor(provider, brand), [provider, brand]);
  const [selected, setSelected] = React.useState(0);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [connected, setConnected] = React.useState<Choice | null>(null);
  const brandHome = brand ? `/${brand}/integrations` : "/";

  const handleCloseWindow = () => {
    notifyOpener({
      type: INTEGRATION_CONNECTED_MESSAGE,
      provider,
      workspaceId,
      brand,
      account: connected,
    });
    window.close();
  };

  const handleErrorClose = () => {
    // A plan limit sends the opener to the upgrade page; anything else is
    // reported so the connect dialog can show it.
    try {
      if (error && mentionsUpgrade(error) && window.opener && !window.opener.closed) {
        window.opener.location.href = accountHref.upgrade();
      } else {
        notifyOpener({ type: INTEGRATION_CONNECTED_MESSAGE, provider, workspaceId, brand, error });
      }
    } catch {
      // Ignore a detached opener.
    }
    window.close();
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <section className="flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface p-8 shadow-card">
        {error ? (
          <>
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-danger-bg text-danger">
              <CircleAlertIcon className="size-6" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-h2 text-fg">{t("errorTitle", { name })}</h1>
              <p className="text-body text-fg-2">{t("errorBody", { name })}</p>
              <p className="rounded-md bg-danger-bg px-3 py-2 text-small text-danger">{error}</p>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={handleErrorClose}>
              {t("close")}
            </Button>
          </>
        ) : connected ? (
          <>
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-success-bg text-success">
              <CheckCircle2Icon className="size-6" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-h2 text-fg">{t("successTitle", { name })}</h1>
              <p className="text-body text-fg-2">{t("successBody", { account: connected.name })}</p>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={handleCloseWindow}>
              {t("close")}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <IntegrationTile monogram={PROVIDERS[provider].monogram} />
              <div className="flex flex-col">
                <h1 className="text-h2 text-fg">{t("chooseTitle")}</h1>
                <p className="text-small text-fg-2">{t("chooseBody", { name })}</p>
              </div>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{t("chooseTitle")}</legend>
              {choices.map((choice, index) => (
                <label
                  key={choice.name}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 transition-colors",
                    index === selected ? "border-blue bg-blue-bg" : "border-border hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="property"
                    className="size-4 accent-(--blue)"
                    checked={index === selected}
                    onChange={() => setSelected(index)}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span dir="ltr" className="truncate text-start font-mono text-small text-fg">
                      {choice.name}
                    </span>
                    <span className="text-caption font-normal text-fg-3">{choice.detail}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={isConnecting}
              onClick={async () => {
                setIsConnecting(true);
                await fakeRequest(900);
                setConnected(choices[selected]);
                setIsConnecting(false);
              }}
            >
              {t("connect")}
            </Button>
          </>
        )}
        <p className="text-center text-caption font-normal text-fg-3">
          {t.rich("manualClose", {
            back: (chunks) => (
              <Link href={brandHome} className="text-blue hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </section>
    </main>
  );
}
