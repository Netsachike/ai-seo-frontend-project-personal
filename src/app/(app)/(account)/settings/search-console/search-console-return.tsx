"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { getErrorMessage } from "@/lib/errors";
import { useSite } from "@/features/workspace/hooks";
import { useMounted } from "@/lib/hooks/use-mounted";
import {
  clearPendingGscConnect,
  matchingProperty,
  readPendingGscConnect,
  useGscProperties,
  useSelectGscProperty,
  type PendingGscConnect,
} from "@/features/search-console/hooks";
import { IntegrationTile } from "@/components/brand/integration-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Where the backend's Google callback sends the browser
 * (`?connected={siteId}`). Lists the site's properties, saves the one that
 * matches its domain (or the one the user picks), syncs it, then returns to
 * where the flow began.
 */
export function SearchConsoleReturn() {
  const t = useTranslations("searchConsoleReturn");
  const params = useSearchParams();
  const mounted = useMounted();
  // sessionStorage only exists in the browser: undefined until mounted.
  const pending = React.useMemo<PendingGscConnect | null | undefined>(
    () => (mounted ? readPendingGscConnect() : undefined),
    [mounted],
  );

  const connected = params.get("connected");
  const siteId = connected && /^\d+$/.test(connected) ? Number(connected) : null;

  if (pending === undefined) return <Skeleton className="h-40 w-full max-w-xl rounded-xl" />;

  if (!siteId) {
    return (
      <Panel title={t("failedTitle")} body={t("failedBody")}>
        <Button asChild variant="primary">
          <Link href={pending?.returnTo ?? "/sites"}>{t("back")}</Link>
        </Button>
      </Panel>
    );
  }

  // The URL names the site Google connected; this tab's record only adds where to go back to.
  if (pending?.siteId === siteId) return <ChooseProperty pending={pending} />;
  return <FromSite siteId={siteId} />;
}

/** No record of the flow in this tab: the domain comes from the site, and the user returns to its Search Console page. */
function FromSite({ siteId }: { siteId: number }) {
  const t = useTranslations("searchConsoleReturn");
  const site = useSite(siteId);

  if (site.isPending) return <Skeleton className="h-40 w-full max-w-xl rounded-xl" />;
  if (site.isError) {
    return (
      <Panel title={t("failedTitle")} body={getErrorMessage(site.error, t("failedBody"))}>
        <Button asChild variant="primary">
          <Link href="/sites">{t("back")}</Link>
        </Button>
      </Panel>
    );
  }
  return (
    <ChooseProperty pending={{ siteId, domain: site.data.domain, returnTo: `/${siteId}/integrations/searchConsole` }} />
  );
}

function ChooseProperty({ pending }: { pending: PendingGscConnect }) {
  const t = useTranslations("searchConsoleReturn");
  const router = useRouter();
  const properties = useGscProperties(pending.siteId);
  const select = useSelectGscProperty(pending.siteId);
  const autoTried = React.useRef(false);

  const choose = React.useCallback(
    (property: string) =>
      select.mutate(property, {
        onSuccess: () => {
          clearPendingGscConnect();
          router.replace(pending.returnTo);
        },
      }),
    [select, router, pending.returnTo],
  );

  const match = properties.data ? matchingProperty(properties.data, pending.domain) : undefined;
  React.useEffect(() => {
    if (match && !autoTried.current) {
      autoTried.current = true;
      choose(match.property);
    }
  }, [match, choose]);

  if (properties.isPending || (match && !select.isError)) {
    return (
      <Panel title={t("connectingTitle")} body={t("connectingBody", { domain: pending.domain })}>
        <Skeleton className="h-12 w-full rounded-lg" />
      </Panel>
    );
  }

  if (properties.isError) {
    return (
      <Panel title={t("failedTitle")} body={getErrorMessage(properties.error, t("failedBody"))}>
        <Button asChild variant="primary">
          <Link href={pending.returnTo}>{t("back")}</Link>
        </Button>
      </Panel>
    );
  }

  const list = properties.data ?? [];
  return (
    <Panel
      title={t("chooseTitle")}
      body={
        list.length ? t("chooseBody", { domain: pending.domain }) : t("noPropertiesBody", { domain: pending.domain })
      }
    >
      {select.isError && (
        <p role="alert" className="text-small text-danger">
          {getErrorMessage(select.error, t("failedBody"))}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {list.map((p) => (
          <li key={p.property}>
            <Button
              variant="secondary"
              className="h-auto w-full justify-between py-3 text-start"
              loading={select.isPending && select.variables === p.property}
              disabled={select.isPending}
              onClick={() => choose(p.property)}
            >
              <span dir="ltr" className="truncate font-mono text-small">
                {p.property}
              </span>
              <span className="text-caption font-normal text-fg-3">{p.permission_level}</span>
            </Button>
          </li>
        ))}
      </ul>
      <Button asChild variant="ghost" className="self-start">
        <Link href={pending.returnTo}>{t("back")}</Link>
      </Button>
    </Panel>
  );
}

function Panel({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full max-w-xl flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center gap-3">
        <IntegrationTile monogram="GSC" logo="searchConsole" />
        <h1 className="text-h2 text-fg">{title}</h1>
      </div>
      <p className="text-body text-fg-2">{body}</p>
      {children}
    </section>
  );
}
