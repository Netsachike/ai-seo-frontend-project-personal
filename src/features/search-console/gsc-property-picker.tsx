"use client";

import * as React from "react";
import { CheckIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GSC_ADD_PROPERTY_URL, matchingProperties, useGscProperties, useSelectGscProperty } from "./hooks";

/**
 * After Google sign-in: the Search Console properties that belong to this
 * site's domain. One match is saved straight away; several, the user picks.
 * None: the domain isn't in Search Console yet, so the user is sent there to
 * add it and can check again without signing in again. Saving a property
 * starts the first sync in the background.
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
  const matches = React.useMemo(
    () => (properties.data ? matchingProperties(properties.data, domain) : []),
    [properties.data, domain],
  );
  const auto = React.useRef(false);

  const save = React.useCallback(
    (property: string) =>
      select.mutate(property, {
        onSuccess: () => onSelected?.(property),
      }),
    [select, onSelected],
  );

  React.useEffect(() => {
    if (matches.length === 1 && !auto.current) {
      auto.current = true;
      save(matches[0].property);
    }
  }, [matches, save]);

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

  if (matches.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-surface-2 px-4 py-4">
        <div className="flex flex-col gap-1">
          <p className="text-small font-semibold text-fg">{t("noneTitle", { domain })}</p>
          <p className="text-small text-fg-2">{t("noneBody", { domain })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="primary">
            <a href={GSC_ADD_PROPERTY_URL} target="_blank" rel="noreferrer">
              {t("openGsc")}
              <ExternalLinkIcon />
            </a>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={properties.isFetching}
            onClick={() => void properties.refetch()}
          >
            <RefreshCwIcon />
            {t("checkAgain")}
          </Button>
        </div>
        <p className="text-caption font-normal text-fg-3">{t("noneHelp")}</p>
      </div>
    );
  }

  if (matches.length === 1) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-small text-success">
        {select.isError ? (
          <span className="text-danger">{getErrorMessage(select.error, t("saveFailed"))}</span>
        ) : (
          <>
            <CheckIcon aria-hidden className="size-4" />
            {select.isSuccess
              ? t("saved", { property: matches[0].property })
              : t("saving", { property: matches[0].property })}
          </>
        )}
      </p>
    );
  }

  const chosen = picked ?? matches[0].property;
  return (
    <div className="flex flex-col gap-3">
      <span className="text-small font-medium text-fg">{t("choose")}</span>
      <div role="radiogroup" aria-label={t("choose")} className="flex flex-col gap-2">
        {matches.map((p) => (
          <button
            key={p.property}
            type="button"
            role="radio"
            aria-checked={p.property === chosen}
            onClick={() => setPicked(p.property)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-start",
              p.property === chosen ? "border-blue bg-blue-bg" : "border-border hover:border-border-strong",
            )}
          >
            <span dir="ltr" className="truncate font-mono text-small text-fg">
              {p.property}
            </span>
            <span className="text-caption font-normal text-fg-3">
              {p.property.startsWith("sc-domain:") ? t("domainProperty") : t("urlProperty")}
            </span>
          </button>
        ))}
      </div>
      {select.isError && (
        <p role="alert" className="text-small text-danger">
          {getErrorMessage(select.error, t("saveFailed"))}
        </p>
      )}
      <Button
        variant="primary"
        className="self-start"
        loading={select.isPending}
        disabled={select.isSuccess}
        onClick={() => save(chosen)}
      >
        {select.isSuccess ? t("savedShort") : t("use")}
      </Button>
    </div>
  );
}
