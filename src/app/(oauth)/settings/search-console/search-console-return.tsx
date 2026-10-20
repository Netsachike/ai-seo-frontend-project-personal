"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useMounted } from "@/lib/hooks/use-mounted";
import { clearPendingGscConnect, readPendingGscConnect } from "@/features/search-console/hooks";
import { useSetupProgress } from "@/features/site-setup/progress";
import { setupPath } from "@/features/site-setup/steps";
import { IntegrationTile } from "@/components/brand/integration-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Where the backend's Google callback lands (`?connected={siteId}`). It
 * shows nothing of its own: the property is picked where the user started.
 * - mid-setup: back to the Search Console step, which lists the properties;
 * - anywhere else: the site's Search Console page, which does the same.
 */
export function SearchConsoleReturn() {
  const t = useTranslations("searchConsoleReturn");
  const router = useRouter();
  const params = useSearchParams();
  const mounted = useMounted();
  const connected = params.get("connected");
  const siteId = connected && /^\d+$/.test(connected) ? Number(connected) : null;

  React.useEffect(() => {
    if (!mounted || !siteId) return;
    const pending = readPendingGscConnect();
    clearPendingGscConnect();
    const inSetup = Boolean(useSetupProgress.getState().steps[siteId]);
    const fromSetup = pending?.siteId === siteId && pending.returnTo.includes("/setup/");
    router.replace(
      fromSetup || inSetup ? setupPath(siteId, "google-search-console") : `/${siteId}/integrations/searchConsole`,
    );
  }, [mounted, siteId, router]);

  if (!mounted || siteId) return <Skeleton className="h-40 w-full max-w-xl rounded-xl" />;

  return (
    <section className="flex w-full max-w-xl flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center gap-3">
        <IntegrationTile monogram="GSC" logo="searchConsole" />
        <h1 className="text-h2 text-fg">{t("failedTitle")}</h1>
      </div>
      <p className="text-body text-fg-2">{t("failedBody")}</p>
      <Button asChild variant="primary" className="self-start">
        <Link href="/sites">{t("back")}</Link>
      </Button>
    </section>
  );
}
