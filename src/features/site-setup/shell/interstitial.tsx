"use client";

import { useTranslations } from "next-intl";

import { LoaderLines } from "./loader-lines";

/**
 * "Setting up your site": a full-step wait between details and Search
 * Console, entering and leaving through the same carousel as the steps.
 */
export function Interstitial() {
  const t = useTranslations("siteSetup.interstitial");
  return (
    <div className="pt-2">
      <LoaderLines size="lg" spinner title={t("title")} subline={t("body")} />
    </div>
  );
}
