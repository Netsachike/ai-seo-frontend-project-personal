"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { getErrorMessage } from "@/lib/errors";
import { useMounted } from "@/lib/hooks/use-mounted";
import { toast } from "@/lib/toast";
import { publishingKeys } from "@/lib/api/query-keys";
import publishingService from "@/services/publishing";
import { ConnectionTestError } from "@/features/publishing/hooks";
import { useSites, useWorkspaces } from "@/features/workspace/hooks";
import {
  clearPendingWpcomConnect,
  readPendingWpcomConnect,
  type PendingWpcomConnect,
} from "@/features/publishing/wpcom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SITES_PATH } from "@/features/site-setup/steps";

/** A site's WordPress.com page, where a connection that failed its test can be tested again. */
const detailsPath = (siteId: number) => `/${siteId}/integrations/wordpressCom`;

/**
 * WordPress.com sends the browser here with `code` and `state`. This page
 * forwards them to the backend (step 2), lets the user pick a site, creates
 * the connection (step 3), activates it by testing its id, and returns to
 * where the user started. If the tab lost which Rankoya site was being
 * connected (another tab, cleared storage), the user picks it here.
 */
export function WpcomCallbackView() {
  const t = useTranslations("integrations.wpcom");
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");
  const mounted = useMounted();
  // Read after mount: sessionStorage only exists in the browser.
  const pending = React.useMemo<PendingWpcomConnect | null>(
    () => (mounted ? readPendingWpcomConnect() : null),
    [mounted],
  );
  const [selected, setSelected] = React.useState<string | null>(null);
  const started = React.useRef(false);
  const queryClient = useQueryClient();
  const workspaces = useWorkspaces();
  const sites = useSites(mounted && !pending ? workspaces.data?.active?.work_space_id : undefined);
  const [fallbackSite, setFallbackSite] = React.useState<string>("");
  const siteId = pending?.siteId ?? (fallbackSite ? Number(fallbackSite) : null);

  const authorize = useMutation({
    mutationFn: () => publishingService.wordpressComCallback({ code: code as string, state: state as string }),
    onSuccess: (data) => setSelected(data.sites[0]?.id ?? null),
  });

  const { mutate: forward } = authorize;
  React.useEffect(() => {
    // The state is single-use, so it is forwarded exactly once.
    if (!code || !state || started.current) return;
    started.current = true;
    forward();
  }, [code, state, forward]);

  const back = pending?.returnTo ?? (siteId ? detailsPath(siteId) : SITES_PATH);

  // Step 3, then activation by id. The pending key is single-use, so once the
  // connection exists a failed test must not leave the user here: they land
  // on the WordPress.com page and test it again from there.
  const complete = useMutation({
    mutationFn: async () => {
      if (!siteId || !authorize.data || !selected) throw new Error(t("failed"));
      const site = authorize.data.sites.find((s) => s.id === selected);
      const { data: connection } = await publishingService.wordpressComComplete(siteId, {
        pending_key: authorize.data.pending_key,
        wordpress_site_id: selected,
        name: site?.name ?? null,
      });
      const name = site?.name ?? connection.name;
      try {
        const { data: test } = await publishingService.testConnection(siteId, connection.id);
        if (!test.success) throw new ConnectionTestError(test.message);
      } catch (error) {
        const failure = error instanceof ConnectionTestError ? error.message : getErrorMessage(error, t("failed"));
        return { name, siteId, failure };
      }
      return { name, siteId, failure: null };
    },
    onSuccess: ({ name, siteId: id, failure }) => {
      void queryClient.invalidateQueries({ queryKey: publishingKeys.all(id) });
      clearPendingWpcomConnect();
      if (failure) {
        toast.error(t("testFailed", { message: failure }));
        router.replace(detailsPath(id));
        return;
      }
      toast.success(t("connected", { name }));
      router.replace(back);
    },
  });

  const error =
    !code || !state ? t("missing") : authorize.isError ? getErrorMessage(authorize.error, t("failed")) : null;

  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-4">
      <Card className="w-full max-w-md gap-5">
        <div className="flex flex-col gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{authorize.data ? t("choose") : (error ?? t("loading"))}</CardDescription>
        </div>

        {authorize.isPending && <Skeleton className="h-24" />}

        {authorize.data && authorize.data.sites.length === 0 && <p className="text-small text-fg-2">{t("noSites")}</p>}

        {authorize.data && authorize.data.sites.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{t("choose")}</legend>
            {authorize.data.sites.map((site) => (
              <label
                key={site.id}
                className={
                  site.id === selected
                    ? "flex cursor-pointer items-start gap-3 rounded-lg border border-blue bg-blue-bg p-3"
                    : "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-border-strong"
                }
              >
                <input
                  type="radio"
                  name="wpcom-site"
                  className="mt-1"
                  checked={site.id === selected}
                  onChange={() => setSelected(site.id)}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-small font-medium text-fg">{site.name}</span>
                  <span className="truncate text-caption font-normal text-fg-3">{site.url}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {mounted && !pending && authorize.data && authorize.data.sites.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-fg">{t("rankoyaSite")}</span>
            <Select value={fallbackSite} onValueChange={setFallbackSite}>
              <SelectTrigger aria-label={t("rankoyaSite")} className="w-full">
                <SelectValue placeholder={t("rankoyaSitePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {(sites.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-caption font-normal text-fg-3">{t("rankoyaSiteHelp")}</span>
          </div>
        )}

        {complete.isError && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2.5 text-small text-danger">
            {getErrorMessage(complete.error, t("failed"))}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="secondary">
            <Link href={back}>{t("back")}</Link>
          </Button>
          {authorize.data && authorize.data.sites.length > 0 && (
            <Button
              variant="primary"
              loading={complete.isPending}
              disabled={!selected || !siteId}
              onClick={() => complete.mutate()}
            >
              {t("connect")}
            </Button>
          )}
        </div>
      </Card>
    </main>
  );
}
