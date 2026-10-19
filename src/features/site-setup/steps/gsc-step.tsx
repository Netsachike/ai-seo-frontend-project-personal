"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { isGscReady, startGscConnect, useGscOverview } from "@/features/search-console/hooks";
import { GscPropertyPicker } from "@/features/search-console/gsc-property-picker";
import { PlatformLogo } from "@/components/brand/platform-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { patchDraft, useDraft } from "../store";
import { StepHeading } from "./step-heading";
import { setupPath } from "../steps";

/**
 * Step 3. Optional but recommended: real queries and impressions sharpen
 * keyword research. Connect sends the browser to Google; the backend's
 * callback returns via /settings/search-console straight back here, where
 * the user picks the property for this domain (or is told to add it to
 * Search Console first).
 */
export function GscStep({ site, onContinue }: { site: Site; onContinue: (skipped: boolean) => void }) {
  const t = useTranslations("siteSetup.gsc");
  const draft = useDraft(site.id);
  const overview = useGscOverview(site.id);
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const connection = overview.data?.connection;
  const connected = isGscReady(connection);
  // Signed in with Google, but no property chosen yet.
  const choosing = Boolean(connection) && !connection?.property;
  const property = connection?.property ?? `sc-domain:${site.domain}`;

  React.useEffect(() => {
    if (connected && connection?.property && !draft.gsc) {
      patchDraft(site.id, {
        gsc: { siteUrl: connection.property, connectedAt: connection.updated_at },
        gscSkipped: false,
      });
    }
  }, [connected, connection, draft.gsc, site.id]);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await startGscConnect({
        siteId: site.id,
        domain: site.domain,
        returnTo: setupPath(site.id, "google-search-console"),
      });
    } catch (err) {
      setError(getErrorMessage(err, t("connectFailed")));
      setConnecting(false);
    }
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
            {connecting || overview.isPending ? (
              t("connecting")
            ) : connected ? (
              <span className="flex items-center gap-1 text-success">
                <CheckIcon aria-hidden className="size-3.5" />
                {t("connected", { property })}
              </span>
            ) : choosing ? (
              <span className="flex items-center gap-1 text-success">
                <CheckIcon aria-hidden className="size-3.5" />
                {t("signedIn")}
              </span>
            ) : (
              t("notConnected")
            )}
          </span>
        </div>
        {!connected && !choosing && (
          <Button variant="primary" loading={connecting} onClick={connect}>
            {t("connect")}
          </Button>
        )}
      </div>

      {choosing && <GscPropertyPicker siteId={site.id} domain={site.domain} />}

      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}

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
