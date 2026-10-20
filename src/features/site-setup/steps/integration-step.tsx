"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import {
  PUBLISHING_FIELDS,
  PUBLISHING_PLATFORMS,
  connectionPayload,
  type ApiPublishingPlatform,
} from "@/features/publishing/forms";
import { ConnectionTestError, useCreateConnection, usePublishingConnections } from "@/features/publishing/hooks";
import { startWpcomConnect } from "@/features/publishing/wpcom";
import { WpcomSitePicker, useWpcomAuthorization } from "@/features/publishing/wpcom-site-picker";
import { SelectField } from "@/components/forms/select-field";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { IntegrationTile } from "@/components/brand/integration-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dur, ease } from "../motion";
import { patchDraft } from "../store";
import { StepHeading } from "./step-heading";
import { ConnectGuide } from "@/components/integrations/connect-guide";
import { setupPath } from "../steps";

/**
 * The API platforms, then the ones without a publishing API: a Next.js app
 * and any other site. Both are copy-and-paste (a `manual` connection,
 * active straight away): Rankoya prepares each article to paste in.
 */
export const PUBLISH_PLATFORMS = [...PUBLISHING_PLATFORMS, "nextjs", "manual"] as const;
export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number];
type CopyPastePlatform = "nextjs" | "manual";
const isCopyPaste = (p: PublishPlatform | null): p is CopyPastePlatform => p === "nextjs" || p === "manual";

/** WordPress is one card: self-hosted connects with an application password, WordPress.com signs in. */
type WordpressHosting = "selfHosted" | "wordpressCom";

const MONOGRAMS: Record<PublishPlatform, string> = {
  wordpress: "WP",
  shopify: "SH",
  webflow: "WF",
  wix: "WX",
  ghost: "GH",
  nextjs: "N",
  manual: "</>",
};

/**
 * Step 6. Where finished articles go: a publishing connection created (and,
 * for API platforms, tested) through the backend. Optional: without one,
 * articles wait in Rankoya to be copied and pasted.
 */
export function IntegrationStep({ site, onContinue }: { site: Site; onContinue: () => void }) {
  const t = useTranslations("siteSetup.integration");
  const tFields = useTranslations("integrations.fields");
  const connections = usePublishingConnections(site.id);
  const create = useCreateConnection(site.id);
  const existing = connections.data?.find((c) => c.status === "active");
  const [choice, setChoice] = React.useState<PublishPlatform | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [hosting, setHosting] = React.useState<WordpressHosting>("selfHosted");
  const [redirecting, setRedirecting] = React.useState(false);
  // Back from WordPress.com sign-in: the site still has to be picked.
  const wpcom = useWpcomAuthorization(site.id);
  const connected: PublishPlatform | null = existing
    ? existing.method === "manual"
      ? existing.platform === "nextjs"
        ? "nextjs"
        : "manual"
      : existing.platform === "wordpress_com"
        ? "wordpress"
        : (existing.platform as PublishPlatform)
    : null;

  const [resumed, setResumed] = React.useState(false);
  if (wpcom.auth && !resumed && !connected) {
    setResumed(true);
    setChoice("wordpress");
    setHosting("wordpressCom");
  }

  const isWpcom = choice === "wordpress" && hosting === "wordpressCom";
  const fields = choice && !isCopyPaste(choice) && !isWpcom ? PUBLISHING_FIELDS[choice] : [];
  const canConnect = isCopyPaste(choice) || (fields.length > 0 && fields.every((f) => (values[f.key] ?? "").trim()));

  const signInWithWpcom = async () => {
    setError(null);
    setRedirecting(true);
    try {
      await startWpcomConnect({ siteId: site.id, returnTo: setupPath(site.id, "integration") });
    } catch (err) {
      setError(getErrorMessage(err, t("failed")));
      setRedirecting(false);
    }
  };

  const connect = (event: React.FormEvent) => {
    event.preventDefault();
    if (isWpcom) {
      if (!wpcom.auth) void signInWithWpcom();
      return;
    }
    if (!choice || !canConnect) return;
    setError(null);
    const name = t(`platform.${choice}.name`);
    const payload = isCopyPaste(choice)
      ? { name, platform: choice === "nextjs" ? ("nextjs" as const) : ("custom" as const), method: "manual" as const }
      : connectionPayload(choice as ApiPublishingPlatform, `${name} · ${site.domain}`, values);
    create.mutate(payload, {
      onSuccess: () =>
        patchDraft(site.id, { integration: { provider: choice, connectedAt: new Date().toISOString() } }),
      onError: (err) =>
        setError(
          err instanceof ConnectionTestError
            ? t("testFailed", { message: err.message })
            : getErrorMessage(err, t("failed")),
        ),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <StepHeading title={t("title")} description={t("description")} />

      <div role="radiogroup" aria-label={t("platforms")} className="grid gap-3 sm:grid-cols-2">
        {PUBLISH_PLATFORMS.map((platform) => {
          const on = choice === platform;
          const isConnected = connected === platform;
          return (
            <button
              key={platform}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={Boolean(connected) && !isConnected}
              onClick={() => {
                setChoice(platform);
                if (platform !== "wordpress") setHosting("selfHosted");
                setValues(platform === "wordpress" ? { site_url: site.domain } : {});
                setError(null);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-surface p-4 text-start transition-[border-color,box-shadow] duration-200",
                on ? "border-fg shadow-[inset_0_0_0_1px_var(--text)]" : "border-border hover:border-border-strong",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <IntegrationTile monogram={MONOGRAMS[platform]} logo={platform} className="rounded-lg" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-h3 text-fg">{t(`platform.${platform}.name`)}</span>
                <span className="truncate text-small text-fg-3">
                  {isConnected ? t("connected") : t(`platform.${platform}.detail`)}
                </span>
              </span>
              {isConnected && <CheckIcon aria-hidden className="size-5 text-success" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {choice && !connected && (
          <motion.form
            key={choice}
            onSubmit={connect}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-card"
          >
            {choice === "wordpress" && (
              <SelectField
                label={t("hosting.label")}
                value={hosting}
                onChange={(value) => {
                  setHosting(value as WordpressHosting);
                  setError(null);
                }}
                options={(["selfHosted", "wordpressCom"] as const).map((value) => ({
                  value,
                  label: t(`hosting.${value}`),
                  detail: t(`hosting.${value}Detail`),
                }))}
              />
            )}
            <p className="text-small text-fg-2">
              {isWpcom ? t("hosting.wordpressComHelp") : t(`platform.${choice}.help`)}
            </p>
            <ConnectGuide provider={isWpcom ? "wordpressCom" : choice} defaultOpen={false} />
            {isWpcom && wpcom.auth && (
              <WpcomSitePicker
                auth={wpcom.auth}
                onDone={(_, failure) => {
                  wpcom.done();
                  if (failure) {
                    setError(t("testFailed", { message: failure }));
                    return;
                  }
                  patchDraft(site.id, {
                    integration: { provider: "wordpress", connectedAt: new Date().toISOString() },
                  });
                }}
              />
            )}
            {fields.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                  const value = values[field.key] ?? "";
                  const set = (next: string) => setValues((prev) => ({ ...prev, [field.key]: next }));
                  return (
                    <FormField key={field.key} label={tFields(field.label)}>
                      {(props) =>
                        field.input === "secret" ? (
                          <PasswordInput
                            {...props}
                            dir="ltr"
                            autoComplete="off"
                            value={value}
                            onChange={(e) => set(e.target.value)}
                          />
                        ) : (
                          <Input
                            {...props}
                            dir="ltr"
                            autoComplete="off"
                            inputMode={field.input === "url" ? "url" : undefined}
                            value={value}
                            onChange={(e) => set(e.target.value)}
                          />
                        )
                      }
                    </FormField>
                  );
                })}
              </div>
            )}
            {error && (
              <p role="alert" className="text-small text-danger">
                {error}
              </p>
            )}
            {!(isWpcom && wpcom.auth) && (
              <Button
                type="submit"
                variant="primary"
                loading={create.isPending || redirecting}
                disabled={!isWpcom && !canConnect}
                className="self-start"
              >
                {isWpcom ? t("hosting.continue") : t("connect")}
              </Button>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-2 flex flex-col gap-3">
        <Button variant="primary" size="lg" disabled={!connected} onClick={onContinue}>
          {t("continue")}
        </Button>
        {!connected && (
          <Button variant="secondary" size="lg" disabled={create.isPending} onClick={onContinue}>
            {t("skip")}
          </Button>
        )}
      </div>
    </div>
  );
}
