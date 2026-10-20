"use client";

import * as React from "react";
import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GSC_ADD_PROPERTY_URL, matchingProperties, useGscProperties, useSelectGscProperty } from "./hooks";

/**
 * After Google sign-in: every Search Console property on the Google account,
 * the ones for this site's domain first and preselected. Nothing is saved
 * until the user clicks; saving starts the first sync in the background.
 * No properties at all: the user is sent to Search Console to add the site
 * and can check again without signing in again.
 */
export function GscPropertyPicker({
  siteId,
  domain,
  onSelected,
}: {
  siteId: number;
  domain: string;
  onSelected?: (property: string) => void;
}) {
  const t = useTranslations("searchConsole.picker");
  const properties = useGscProperties(siteId);
  const select = useSelectGscProperty(siteId);
  const [picked, setPicked] = React.useState<string | null>(null);

  const { list, matched } = React.useMemo(() => {
    const all = properties.data ?? [];
    const matches = matchingProperties(all, domain);
    const ids = new Set(matches.map((p) => p.property));
    return { list: [...matches, ...all.filter((p) => !ids.has(p.property))], matched: ids };
  }, [properties.data, domain]);

  const addOrRetry = (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="secondary">
        <a href={GSC_ADD_PROPERTY_URL} target="_blank" rel="noreferrer">
          {t("openGsc")}
          <ExternalLinkIcon />
        </a>
      </Button>
      <Button size="sm" variant="secondary" loading={properties.isFetching} onClick={() => void properties.refetch()}>
        <RefreshCwIcon />
        {t("checkAgain")}
      </Button>
    </div>
  );

  if (properties.isPending) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <span className="text-caption font-normal text-fg-3">{t("loading")}</span>
      </div>
    );
  }

  if (properties.isError) {
    return (
      <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-small text-danger">
        {getErrorMessage(properties.error, t("failed"))}
      </p>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-surface-2 px-4 py-4">
        <div className="flex flex-col gap-1">
          <p className="text-small font-semibold text-fg">{t("noneTitle", { domain })}</p>
          <p className="text-small text-fg-2">{t("noneBody", { domain })}</p>
        </div>
        {addOrRetry}
        <p className="text-caption font-normal text-fg-3">{t("noneHelp")}</p>
      </div>
    );
  }

  const chosen = picked ?? (matched.size > 0 ? list[0].property : null);
  const locked = select.isPending || select.isSuccess;
  return (
    <div className="flex flex-col gap-3">
      <span className="text-small font-medium text-fg">{t("choose")}</span>
      {matched.size === 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-4 py-3">
          <p className="text-small text-fg-2">{t("noMatch", { domain })}</p>
          {addOrRetry}
        </div>
      )}
      <div role="radiogroup" aria-label={t("choose")} className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {list.map((p) => (
          <button
            key={p.property}
            type="button"
            role="radio"
            aria-checked={p.property === chosen}
            disabled={locked}
            onClick={() => setPicked(p.property)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-start disabled:cursor-default",
              p.property === chosen ? "border-blue bg-blue-bg" : "border-border hover:border-border-strong",
            )}
          >
            <span dir="ltr" className="truncate font-mono text-small text-fg">
              {p.property}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {matched.has(p.property) && <Badge variant="success">{t("matches")}</Badge>}
              <span className="text-caption font-normal text-fg-3">
                {p.property.startsWith("sc-domain:") ? t("domainProperty") : t("urlProperty")}
              </span>
            </span>
          </button>
        ))}
      </div>
      {select.isError && (
        <p role="alert" className="text-small text-danger">
          {getErrorMessage(select.error, t("saveFailed"))}
        </p>
      )}
      {select.isSuccess && chosen && (
        <p role="status" className="text-small text-success">
          {t("saved", { property: chosen })}
        </p>
      )}
      <Button
        variant="primary"
        className="self-start"
        loading={select.isPending}
        disabled={!chosen || select.isSuccess}
        onClick={() => chosen && select.mutate(chosen, { onSuccess: () => onSelected?.(chosen) })}
      >
        {select.isSuccess ? t("savedShort") : t("use")}
      </Button>
    </div>
  );
}
