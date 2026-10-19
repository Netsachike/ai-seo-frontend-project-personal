"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRightIcon, CheckIcon, MinusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { Button } from "@/components/ui/button";
import { useElapsedStage } from "../hooks/use-min-duration";
import { dur, ease, STAGGER } from "../motion";
import { LoaderLines } from "../shell/loader-lines";
import { useDraft } from "../store";
import { PUBLISH_PLATFORMS, type PublishPlatform } from "./integration-step";
import { StepHeading } from "./step-heading";

/** The plan "builds" through these sublines before the summary shows. */
const BUILD_STAGES = [1100, 2200, 3200] as const;

/**
 * Step 8. Rankoya turns the confirmed profile and topics into the first content
 * plan, then the summary lists what was set up and what was skipped, so
 * nothing looks finished that isn't.
 */
export function DoneStep({ site, finishing, onFinish }: { site: Site; finishing: boolean; onFinish: () => void }) {
  const t = useTranslations("siteSetup.done");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const draft = useDraft(site.id);
  const stage = useElapsedStage(true, BUILD_STAGES);
  const built = stage >= BUILD_STAGES.length;

  const regions = React.useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const languages = React.useMemo(() => new Intl.DisplayNames([locale], { type: "language" }), [locale]);
  const topicLabels = (draft.topicSuggestions ?? [])
    .filter((topic) => draft.coreTopics.includes(topic.id))
    .map((topic) => topic.label);

  const provider = draft.integration?.provider;
  const platform = (PUBLISH_PLATFORMS as readonly string[]).includes(provider ?? "")
    ? (provider as PublishPlatform)
    : null;
  const rows: Array<{
    key: "profile" | "market" | "searchConsole" | "topics" | "publishing" | "schedule";
    done: boolean;
    value: string;
  }> = [
    { key: "profile", done: draft.descriptionConfirmed && draft.audienceConfirmed, value: t("rows.profileValue") },
    {
      key: "market",
      done: Boolean(draft.country && draft.language),
      value:
        draft.country && draft.language
          ? `${regions.of(draft.country) ?? draft.country} · ${languages.of(draft.language) ?? draft.language}`
          : "",
    },
    { key: "searchConsole", done: Boolean(draft.gsc), value: draft.gsc?.siteUrl ?? t("rows.skipped") },
    { key: "topics", done: topicLabels.length > 0, value: topicLabels.join(", ") || t("rows.topicsSkipped") },
    {
      key: "publishing",
      done: Boolean(platform),
      value: platform ? t(`rows.platform.${platform}`) : t("rows.manual"),
    },
    {
      key: "schedule",
      done: Boolean(draft.preferences),
      value: draft.preferences
        ? t("rows.scheduleValue", {
            count: draft.preferences.articlesPerWeek,
            mode: t(`rows.mode.${draft.preferences.publishMode}`),
          })
        : "",
    },
  ];

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!built ? (
        <motion.div key="building" exit={{ opacity: 0 }} transition={{ duration: dur.fast }} className="pt-2">
          <LoaderLines
            spinner
            size="lg"
            title={t("building.title")}
            subline={t(`building.stage${Math.min(stage, 2) as 0 | 1 | 2}`, { count: draft.coreTopics.length })}
          />
        </motion.div>
      ) : (
        <motion.div
          key="ready"
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.base, ease: ease.out }}
          className="flex flex-col gap-8"
        >
          <StepHeading title={t("title")} description={t("description", { name: site.name })} />
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface shadow-card">
            {rows.map((row, i) => (
              <motion.li
                key={row.key}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur.base, ease: ease.out, delay: reduce ? 0 : 0.1 + i * STAGGER }}
                className="flex items-start gap-3 px-5 py-4"
              >
                <span
                  className={
                    row.done
                      ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-bg text-success"
                      : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-3"
                  }
                >
                  {row.done ? (
                    <CheckIcon aria-hidden className="size-3.5" />
                  ) : (
                    <MinusIcon aria-hidden className="size-3.5" />
                  )}
                  <span className="sr-only">{row.done ? t("rows.doneLabel") : t("rows.skippedLabel")}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-h3 text-fg">{t(`rows.${row.key}`)}</span>
                  {row.value && <span className="text-small text-fg-3">{row.value}</span>}
                </span>
              </motion.li>
            ))}
          </ul>
          <p className="text-small text-fg-3">{t("later")}</p>
          <Button variant="primary" size="lg" loading={finishing} onClick={onFinish}>
            {t("cta")}
            <ArrowRightIcon className="rtl:-scale-x-100" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
