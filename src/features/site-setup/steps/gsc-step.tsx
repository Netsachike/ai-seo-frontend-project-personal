"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Brand } from "@/lib/api/types";
import { useIntegrations } from "@/features/integrations/store";
import { PlatformLogo } from "@/components/brand/platform-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { patchDraft, useDraft } from "../store";
import { StepHeading } from "./step-heading";

/** Minimum time the "Connecting" state shows, so the OAuth return never flickers. */
const CONNECT_MIN_MS = 1200;

/**
 * Step 3. Optional but recommended: real queries and impressions sharpen
 * keyword research. The real flow is Google OAuth (webmasters.readonly,
 * offline access) that auto-matches sc-domain:{domain} or https://{domain}/;
 * here the connection is faked after a short wait.
 */
export function GscStep({ site, onContinue }: { site: Brand; onContinue: (skipped: boolean) => void }) {
  const t = useTranslations("siteSetup.gsc");
  const draft = useDraft(site.id);
  const connectIntegration = useIntegrations((s) => s.connect);
  const [connecting, setConnecting] = React.useState(false);
  const property = `sc-domain:${site.domain}`;
  const connected = Boolean(draft.gsc);

  const connect = async () => {
    setConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, CONNECT_MIN_MS));
    const connectedAt = new Date().toISOString();
    patchDraft(site.id, { gsc: { siteUrl: property, connectedAt }, gscSkipped: false });
    connectIntegration({
      provider: "searchConsole",
      brandSlug: site.slug,
      account: { name: property, detail: t("domainProperty") },
    });
    setConnecting(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        title={t("title")}
        badge={
          <Badge variant="success" shape="pill">
            {t("recommended")}
          </Badge>
        }
        description={t("description")}
      />

      <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-card">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-border bg-white">
          <PlatformLogo platform="google" size={24} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-h3 text-fg">{t("name")}</span>
          <span role="status" className="truncate text-small text-fg-3">
            {connecting ? (
              t("connecting")
            ) : connected ? (
              <span className="flex items-center gap-1 text-success">
                <CheckIcon aria-hidden className="size-3.5" />
                {t("connected", { property: draft.gsc?.siteUrl ?? property })}
              </span>
            ) : (
              t("notConnected")
            )}
          </span>
        </div>
        {!connected && (
          <Button variant="primary" loading={connecting} onClick={connect}>
            {t("connect")}
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button variant="primary" size="lg" disabled={!connected} onClick={() => onContinue(false)}>
          {t("continue")}
        </Button>
        {!connected && (
          <Button
            variant="secondary"
            size="lg"
            disabled={connecting}
            onClick={() => {
              patchDraft(site.id, { gscSkipped: true });
              onContinue(true);
            }}
          >
            {t("skip")}
          </Button>
        )}
      </div>
    </div>
  );
}
