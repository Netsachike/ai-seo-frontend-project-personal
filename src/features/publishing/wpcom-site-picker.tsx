"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type { PublishingConnection, WordpressComSite } from "@/types/types";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { useMounted } from "@/lib/hooks/use-mounted";
import { publishingKeys } from "@/lib/api/query-keys";
import publishingService from "@/services/publishing";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionTestError } from "./hooks";
import { clearWpcomAuthorization, lookupWpcomSite, readWpcomAuthorization, type WpcomAuthorization } from "./wpcom";

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
 * After WordPress.com sign-in: the user picks which WordPress.com site
 * Rankoya publishes to. The sites come from the backend's redirect; when it
 * didn't list them, the user types the site's address and its id is looked
 * up. Then the connection is created and tested (which activates it).
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
  const [address, setAddress] = React.useState("");
  const [found, setFound] = React.useState<WordpressComSite | null>(null);
  const listed = auth.sites.length > 0;

  const lookup = useMutation({
    mutationFn: async () => {
      const site = await lookupWpcomSite(address);
      if (!site) throw new Error(t("lookupFailed", { address: address.trim() }));
      return site;
    },
    onSuccess: setFound,
  });

  const site = listed ? auth.sites.find((s) => s.id === picked) : found;

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

  return (
    <div className="flex flex-col gap-3">
      <span className="text-small font-medium text-fg">{listed ? t("choose") : t("enterAddress")}</span>

      {listed ? (
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
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (address.trim()) lookup.mutate();
          }}
        >
          <FormField label={t("addressLabel")} helper={t("addressHelp")}>
            {(props) => (
              <div className="flex gap-2">
                <Input
                  {...props}
                  dir="ltr"
                  inputMode="url"
                  autoComplete="off"
                  placeholder={t("addressPlaceholder")}
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setFound(null);
                  }}
                />
                <Button type="submit" variant="secondary" loading={lookup.isPending} disabled={!address.trim()}>
                  {t("find")}
                </Button>
              </div>
            )}
          </FormField>
          {lookup.isError && (
            <p role="alert" className="text-small text-danger">
              {lookup.error.message}
            </p>
          )}
          {found && (
            <p className="rounded-lg border border-blue bg-blue-bg px-4 py-3 text-small text-fg">
              {t("found", { name: found.name, url: found.url })}
            </p>
          )}
        </form>
      )}

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
