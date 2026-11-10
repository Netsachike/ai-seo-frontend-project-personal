"use client";

import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFeedLinks } from "@/features/publishing/webhook";
import { CopyButton } from "@/components/brand/copy-button";
import { Skeleton } from "@/components/ui/skeleton";

/** The site's RSS and JSON feed links, to copy into a feed reader, Make's RSS module, or an app. */
export function FeedLinks({ siteId }: { siteId: number }) {
  const t = useTranslations("integrations.feed");
  const links = useFeedLinks(siteId);

  if (links.isPending) return <Skeleton className="h-28 w-full rounded-md" />;
  if (links.isError || !links.data) {
    return (
      <p role="alert" className="rounded-md bg-danger-bg px-3 py-2.5 text-small text-danger">
        {t("failed")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {(["rss", "json"] as const).map((kind) => (
        <div key={kind} className="flex flex-col gap-1.5 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-small font-semibold text-fg">{t(`${kind}.title`)}</p>
            <CopyButton value={links.data[kind]} />
          </div>
          <code dir="ltr" className="truncate rounded bg-surface-2 px-2 py-1.5 font-mono text-[12px] text-fg">
            {links.data[kind]}
          </code>
          <p className="text-caption font-normal text-fg-3">{t(`${kind}.body`)}</p>
        </div>
      ))}
      {!links.data.ready && (
        <p className="flex items-start gap-2 rounded-md bg-bg p-3 text-small text-fg-2">
          <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-3" />
          {t("notLive")}
        </p>
      )}
      <p className="text-caption font-normal text-fg-3">{t("private")}</p>
    </div>
  );
}
