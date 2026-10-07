"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Brand } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useIntegrations } from "@/features/integrations/store";
import { FormField } from "@/components/forms/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dur, ease } from "../motion";
import { patchDraft, useDraft } from "../store";
import { StepHeading } from "./step-heading";

export const PUBLISH_PLATFORMS = ["wordpress", "webhook", "shopify", "webflow", "wix", "ghost"] as const;
export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number];
const isPublishPlatform = (value: string | undefined): value is PublishPlatform =>
  (PUBLISH_PLATFORMS as readonly string[]).includes(value ?? "");

type Platform = { id: PublishPlatform; monogram: string; soon?: boolean };

/** Publishing targets, WordPress first (as in the MVP scope); the rest follow. */
const platforms: Platform[] = [
  { id: "wordpress", monogram: "WP" },
  { id: "webhook", monogram: "</>" },
  { id: "shopify", monogram: "SH", soon: true },
  { id: "webflow", monogram: "WF", soon: true },
  { id: "wix", monogram: "WX", soon: true },
  { id: "ghost", monogram: "GH", soon: true },
];

const CONNECT_MS = 1200;

/**
 * Step 6. Where finished articles go. Connecting is optional: without it,
 * articles wait in Orbit to be copied and pasted.
 */
export function IntegrationStep({ site, onContinue }: { site: Brand; onContinue: () => void }) {
  const t = useTranslations("siteSetup.integration");
  const draft = useDraft(site.id);
  const connectIntegration = useIntegrations((s) => s.connect);
  const saved = draft.integration?.provider;
  const [choice, setChoice] = React.useState<PublishPlatform | null>(isPublishPlatform(saved) ? saved : null);
  const [fields, setFields] = React.useState({ url: `https://${site.domain}`, endpoint: "", user: "", secret: "" });
  const [connecting, setConnecting] = React.useState(false);
  const connected = draft.integration;

  const canConnect =
    choice === "wordpress"
      ? fields.url.trim() && fields.user.trim() && fields.secret.trim()
      : choice === "webhook"
        ? /^https:\/\/\S+$/.test(fields.endpoint.trim())
        : false;

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!choice || !canConnect) return;
    setConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, CONNECT_MS));
    patchDraft(site.id, { integration: { provider: choice, connectedAt: new Date().toISOString() } });
    if (choice === "wordpress") {
      connectIntegration({
        provider: "wordpress",
        brandSlug: site.slug,
        account: { name: fields.url.replace(/^https?:\/\//, ""), detail: fields.user },
      });
    }
    setConnecting(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <StepHeading title={t("title")} description={t("description")} />

      <div role="radiogroup" aria-label={t("platforms")} className="grid gap-3 sm:grid-cols-2">
        {platforms.map((platform) => {
          const on = choice === platform.id;
          const isConnected = connected?.provider === platform.id;
          return (
            <button
              key={platform.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={platform.soon || (Boolean(connected) && !isConnected)}
              onClick={() => setChoice(platform.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-surface p-4 text-start transition-[border-color,box-shadow] duration-200",
                on ? "border-fg shadow-[inset_0_0_0_1px_var(--text)]" : "border-border hover:border-border-strong",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 font-mono text-[12px] font-semibold text-fg-2"
              >
                {platform.monogram}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-h3 text-fg">{t(`platform.${platform.id}.name`)}</span>
                <span className="truncate text-small text-fg-3">
                  {isConnected ? t("connected") : t(`platform.${platform.id}.detail`)}
                </span>
              </span>
              {platform.soon && (
                <Badge variant="neutral" shape="pill">
                  {t("soon")}
                </Badge>
              )}
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
            <p className="text-small text-fg-2">{t(`platform.${choice}.help`)}</p>
            <FormField label={t(choice === "webhook" ? "fields.endpoint" : "fields.siteUrl")}>
              {(props) => (
                <Input
                  {...props}
                  dir="ltr"
                  inputMode="url"
                  value={choice === "webhook" ? fields.endpoint : fields.url}
                  placeholder={choice === "webhook" ? "https://" : undefined}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, [choice === "webhook" ? "endpoint" : "url"]: e.target.value }))
                  }
                />
              )}
            </FormField>
            {choice === "wordpress" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("fields.username")}>
                  {(props) => (
                    <Input
                      {...props}
                      autoComplete="off"
                      value={fields.user}
                      onChange={(e) => setFields((f) => ({ ...f, user: e.target.value }))}
                    />
                  )}
                </FormField>
                <FormField label={t("fields.appPassword")} helper={t("fields.appPasswordHelper")}>
                  {(props) => (
                    <Input
                      {...props}
                      type="password"
                      autoComplete="new-password"
                      value={fields.secret}
                      onChange={(e) => setFields((f) => ({ ...f, secret: e.target.value }))}
                    />
                  )}
                </FormField>
              </div>
            )}
            <Button type="submit" variant="primary" loading={connecting} disabled={!canConnect} className="self-start">
              {t("connect")}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-2 flex flex-col gap-3">
        <Button variant="primary" size="lg" disabled={!connected} onClick={onContinue}>
          {t("continue")}
        </Button>
        {!connected && (
          <Button variant="secondary" size="lg" disabled={connecting} onClick={onContinue}>
            {t("skip")}
          </Button>
        )}
      </div>
    </div>
  );
}
