"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckIcon, StarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useElapsedStage, useMinDuration } from "../../hooks/use-min-duration";
import { dur, ease, STAGGER } from "../../motion";
import { LoaderLines } from "../../shell/loader-lines";
import { CORE_TOPIC_COUNT } from "../../steps";
import { patchDraft, useDraft, type TopicSuggestion } from "../../store";
import { topicsQuery } from "../../topics-query";
import { StepHeading } from "../step-heading";
import { TopicMap } from "./topic-map";

const MIN_LOADER_MS = 1500;
/** Subline changes at 8 s; Retry appears at 2 min, since keyword discovery and the map build are slow. */
const STAGES = [8000, 120000] as const;

/**
 * Step 4. Exactly five core topics anchor the topical map. Picks draw into
 * the map as they are made; at five the rest dim, which is the whole message
 * (no error for trying a sixth).
 */
export function CoreTopicsStep({ site, onContinue }: { site: Site; onContinue: () => void }) {
  const t = useTranslations("siteSetup.topics");
  const format = useFormatter();
  const reduce = useReducedMotion();
  const draft = useDraft(site.id);
  const topics = useQuery({
    ...topicsQuery(site),
    // An empty list saved by an earlier version is ignored, so discovery runs again.
    initialData: draft.topicSuggestions?.length ? draft.topicSuggestions : undefined,
  });
  const [selected, setSelected] = React.useState<string[]>(draft.coreTopics);

  React.useEffect(() => {
    if (topics.data?.length && !draft.topicSuggestions?.length) patchDraft(site.id, { topicSuggestions: topics.data });
  }, [topics.data, draft.topicSuggestions, site.id]);

  // Prefetched during the interstitial: show the topics straight away, no loader.
  const [cached] = React.useState(topics.isSuccess);
  const waited = useMinDuration(!cached, topics.isSuccess, MIN_LOADER_MS);
  const ready = cached || waited;
  const stage = useElapsedStage(!ready && !topics.isError, STAGES);
  const list: TopicSuggestion[] = ready ? (topics.data ?? []) : [];
  const byId = new Map(list.map((topic) => [topic.id, topic]));
  const picked = selected.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  // A small site can have fewer clusters than five; then every one of them is the full set.
  const required = Math.min(CORE_TOPIC_COUNT, list.length);
  const full = selected.length >= required;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < CORE_TOPIC_COUNT ? [...s, id] : s));

  // The map fills one slot after another rather than all at once.
  const applyRecommended = () => {
    const ids = list.filter((topic) => topic.recommended && !selected.includes(topic.id)).map((topic) => topic.id);
    const room = required - selected.length;
    ids.slice(0, room).forEach((id, i) => {
      setTimeout(
        () => setSelected((s) => (s.length < CORE_TOPIC_COUNT && !s.includes(id) ? [...s, id] : s)),
        reduce ? 0 : i * 80,
      );
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <StepHeading title={t("title")} description={t("description")} />

      <div className="grid place-items-center rounded-xl bg-surface-2/60 px-4 py-8">
        <TopicMap siteName={site.name} topics={picked} label={t("mapLabel", { count: picked.length })} />
      </div>

      {!ready ? (
        <div className="rounded-xl bg-surface-2/60 p-6">
          {topics.isError ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-body-lg text-fg">{t("error")}</p>
              {getErrorMessage(topics.error, "") && (
                <p className="text-small text-fg-2">{getErrorMessage(topics.error, "")}</p>
              )}
              <Button variant="secondary" onClick={() => void topics.refetch()}>
                {t("retry")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <LoaderLines
                spinner
                title={t("generating.title")}
                subline={
                  stage === 0 ? t("generating.body") : stage === 1 ? t("generating.slow") : t("generating.stuck")
                }
              />
              {stage === 2 && (
                <Button variant="secondary" size="sm" onClick={() => void topics.refetch()}>
                  {t("retry")}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex min-h-9 items-center justify-between gap-3">
            <p className="num text-h3 text-fg" aria-live="polite">
              {t("selected", { count: selected.length, total: required })}
            </p>
            <AnimatePresence mode="wait" initial={false}>
              {full ? (
                <motion.span
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: dur.fast }}
                >
                  <Badge variant="success" shape="pill" className="h-8 gap-1.5 px-3 text-small">
                    <CheckIcon aria-hidden className="size-3.5" />
                    {t("ready")}
                  </Badge>
                </motion.span>
              ) : (
                <motion.span
                  key="use"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: dur.fast }}
                >
                  <Button variant="secondary" size="sm" onClick={applyRecommended} className="text-signal">
                    <StarIcon aria-hidden />
                    {t("useRecommended")}
                  </Button>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((topic, i) => {
              const on = selected.includes(topic.id);
              const dimmed = full && !on;
              return (
                <motion.li
                  key={topic.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur.base, ease: ease.out, delay: reduce ? 0 : i * STAGGER }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-disabled={dimmed || undefined}
                    tabIndex={dimmed ? -1 : undefined}
                    onClick={() => !dimmed && toggle(topic.id)}
                    className={cn(
                      "flex h-full min-h-[76px] w-full items-start justify-between gap-3 rounded-xl border bg-surface p-4 text-start transition-[border-color,opacity,box-shadow] duration-200",
                      on
                        ? "border-fg shadow-[inset_0_0_0_1px_var(--text)]"
                        : "border-border hover:border-border-strong",
                      dimmed && "pointer-events-none opacity-50",
                    )}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-body-lg font-medium text-fg">
                        {topic.label}
                        {topic.recommended && (
                          <>
                            <StarIcon
                              aria-hidden
                              className="ms-1.5 inline size-3.5 -translate-y-px fill-signal text-signal"
                            />
                            <span className="sr-only">{t("recommended")}</span>
                          </>
                        )}
                      </span>
                      <span className="num text-caption font-normal text-fg-3">
                        {t("volume", { volume: format.number(topic.volume, { notation: "compact" }) })}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-[5px] border transition-colors duration-200",
                        on ? "border-fg bg-fg text-surface" : "border-border-strong bg-surface",
                      )}
                    >
                      {on && <CheckIcon className="size-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
          <p className="text-small text-fg-3">{t("footnote")}</p>
        </div>
      )}

      <div className="sticky bottom-0 -mx-1 bg-gradient-to-t from-surface from-60% to-transparent px-1 pt-8 pb-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!ready || !full}
          onClick={() => {
            patchDraft(site.id, { coreTopics: selected });
            onContinue();
          }}
        >
          {t("continue")}
        </Button>
      </div>
    </div>
  );
}
