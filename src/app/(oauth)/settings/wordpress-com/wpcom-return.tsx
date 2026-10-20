"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useMounted } from "@/lib/hooks/use-mounted";
import {
  clearPendingWpcomConnect,
  readPendingWpcomConnect,
  saveWpcomAuthorization,
  sitesFromUrl,
} from "@/features/publishing/wpcom";
import { useSites, useWorkspaces } from "@/features/workspace/hooks";
import { useSetupProgress } from "@/features/site-setup/progress";
import { SITES_PATH, setupPath } from "@/features/site-setup/steps";
import { WpcomCallbackView } from "@/app/integrations/wordpress-com/callback/wpcom-callback-view";
import { IntegrationTile } from "@/components/brand/integration-row";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const asId = (value: string | null | undefined) => (value && /^\d+$/.test(value) ? Number(value) : null);

/**
 * Where the backend's WordPress.com callback lands:
 * `?connected=pending&pending_key=…&site_id={Rankoya site}` (and the
 * WordPress.com sites, when it sends them). Like the Search Console return,
 * it keeps the sign-in and forwards to where the user started, where they
 * pick the WordPress.com site:
 * - mid-setup: the setup integration step;
 * - anywhere else: the site's WordPress.com page.
 * If neither this tab nor the URL says which Rankoya site it was for, the
 * user picks it here first.
 */
export function WpcomReturn() {
  const t = useTranslations("integrations.wpcom");
  const router = useRouter();
  const params = useSearchParams();
  const mounted = useMounted();
  const pendingKey = params.get("pending_key");
  const pending = React.useMemo(() => (mounted ? readPendingWpcomConnect() : null), [mounted]);
  const [chosen, setChosen] = React.useState("");
  const siteId = pending?.siteId ?? asId(params.get("site_id")) ?? asId(chosen);
  const workspaces = useWorkspaces();
  const sites = useSites(mounted && pendingKey && !siteId ? workspaces.data?.active?.work_space_id : undefined);

  React.useEffect(() => {
    if (!mounted || !pendingKey || !siteId) return;
    saveWpcomAuthorization({ siteId, pendingKey, sites: sitesFromUrl(params) });
    clearPendingWpcomConnect();
    const fromSetup = pending?.siteId === siteId && pending.returnTo.includes("/setup/");
    const inSetup = Boolean(useSetupProgress.getState().steps[siteId]);
    router.replace(fromSetup || inSetup ? setupPath(siteId, "integration") : `/${siteId}/integrations/wordpressCom`);
  }, [mounted, pendingKey, siteId, pending, params, router]);

  // WordPress.com's own redirect (`code` + `state`), from before the backend redirected here.
  if (!pendingKey && params.get("code")) return <WpcomCallbackView />;
  if (!mounted || (pendingKey && siteId)) return <Skeleton className="h-40 w-full max-w-xl rounded-xl" />;

  return (
    <section className="flex w-full max-w-xl flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center gap-3">
        <IntegrationTile monogram="WP" logo="wordpressCom" />
        <h1 className="text-h2 text-fg">{t("title")}</h1>
      </div>
      {pendingKey ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-fg">{t("rankoyaSite")}</span>
          <Select value={chosen} onValueChange={setChosen}>
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
      ) : (
        <>
          <p className="text-body text-fg-2">{t("missing")}</p>
          <Button asChild variant="primary" className="self-start">
            <Link href={SITES_PATH}>{t("back")}</Link>
          </Button>
        </>
      )}
    </section>
  );
}
