"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type { PublishingConnection } from "@/types/types";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { useMounted } from "@/lib/hooks/use-mounted";
import { publishingKeys } from "@/lib/api/query-keys";
import publishingService from "@/services/publishing";
import { Button } from "@/components/ui/button";
import { ConnectionTestError } from "./hooks";
import { clearWpcomAuthorization, readWpcomAuthorization, type WpcomAuthorization } from "./wpcom";

/** The WordPress.com sign-in waiting for this site, read once in the browser. */
export function useWpcomAuthorization(siteId: number | undefined) {
  const mounted = useMounted();
  const [cleared, setCleared] = React.useState(false);
  const auth = React.useMemo(
    () => (mounted && siteId && !cleared ? readWpcomAuthorization(siteId) : null),
    [mounted, siteId, cleared],
  );
  return { auth, done: () => setCleared(true) };
}

/**
 * After WordPress.com sign-in: the site chosen on WordPress.com's own consent
 * screen, from the backend's redirect. One site connects by itself: the
 * connection is created and tested (which activates it). Only an
 * authorization for several sites (`scope=global`) asks which one.
 */
export function WpcomSitePicker({
  auth,
  onDone,
}: {
  auth: WpcomAuthorization;
  /** After the connection is created; `failure` is the test's message when activating it failed. */
  onDone?: (connection: PublishingConnection, failure: string | null) => void;
}) {
  const t = useTranslations("integrations.wpcom");
  const queryClient = useQueryClient();
  const [picked, setPicked] = React.useState<string | null>(auth.sites[0]?.id ?? null);
  const site = auth.sites.find((s) => s.id === picked);

  const complete = useMutation({
    mutationFn: async () => {
      if (!site) throw new Error(t("failed"));
      const { data: connection } = await publishingService.wordpressComComplete(auth.siteId, {
        pending_key: auth.pendingKey,
        wordpress_site_id: site.id,
        name: site.name || null,
      });
      // The pending key is used up: from here a failed test is retried from the connection itself.
      clearWpcomAuthorization();
      try {
        const { data: test } = await publishingService.testConnection(auth.siteId, connection.id);
        if (!test.success) throw new ConnectionTestError(test.message);
        return { connection, failure: null };
      } catch (error) {
        const failure = error instanceof ConnectionTestError ? error.message : getErrorMessage(error, t("failed"));
        return { connection, failure };
      }
    },
    onSuccess: ({ connection, failure }) => {
      void queryClient.invalidateQueries({ queryKey: publishingKeys.all(auth.siteId) });
      onDone?.(connection, failure);
    },
  });

  // The site was chosen on WordPress.com's screen: connect it straight away, once.
  const auto = React.useRef(false);
  const { mutate } = complete;
  React.useEffect(() => {
    if (auth.sites.length === 1 && !auto.current) {
      auto.current = true;
      mutate();
    }
  }, [auth.sites.length, mutate]);

  if (auth.sites.length === 1) {
    const only = auth.sites[0];
    const label = only.name || only.url || t("siteId", { id: only.id });
    return complete.isError ? (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-small text-danger">
          {getErrorMessage(complete.error, t("failed"))}
        </p>
        <Button variant="primary" className="self-start" onClick={() => complete.mutate()}>
          {t("retry")}
        </Button>
      </div>
    ) : (
      <p role="status" className="rounded-lg bg-surface-2 px-4 py-3 text-small text-fg-2">
        {t("connecting", { name: label })}
      </p>
    );
  }

  if (auth.sites.length === 0) {
    return (
      <p role="alert" className="rounded-lg bg-surface-2 px-4 py-3 text-small text-fg-2">
        {t("noSiteList")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-small font-medium text-fg">{t("choose")}</span>
      <div role="radiogroup" aria-label={t("choose")} className="flex flex-col gap-2">
        {auth.sites.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === picked}
            disabled={complete.isPending}
            onClick={() => setPicked(s.id)}
            className={cn(
              "flex flex-col rounded-lg border px-4 py-3 text-start",
              s.id === picked ? "border-blue bg-blue-bg" : "border-border hover:border-border-strong",
            )}
          >
            <span className="text-small font-medium text-fg">{s.name || t("siteId", { id: s.id })}</span>
            {s.url && (
              <span dir="ltr" className="truncate text-start text-caption font-normal text-fg-3">
                {s.url}
              </span>
            )}
          </button>
        ))}
      </div>

      {complete.isError && (
        <p role="alert" className="text-small text-danger">
          {getErrorMessage(complete.error, t("failed"))}
        </p>
      )}

      <Button
        variant="primary"
        className="self-start"
        loading={complete.isPending}
        disabled={!site}
        onClick={() => complete.mutate()}
      >
        {t("connect")}
      </Button>
    </div>
  );
}
