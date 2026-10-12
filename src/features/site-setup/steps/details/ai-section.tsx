"use client";

import * as React from "react";
import { motion } from "motion/react";
import { QuoteIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Site } from "@/types/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamProfileSection, type ProfileSection } from "../../fake-ai";
import { useElapsedStage, useMinDuration } from "../../hooks/use-min-duration";
import { useSmoothText } from "../../hooks/use-smooth-text";
import { useStickToBottom } from "../../hooks/use-stick-to-bottom";
import { useTextStream } from "../../hooks/use-text-stream";
import { dur, ease } from "../../motion";
import { LoaderLines } from "../../shell/loader-lines";
import type { SectionStatus } from "./setup-section";
import { StreamedMarkdown } from "./streamed-markdown";

/** Minimum loader time per section, so a fast answer never flashes. */
const MIN_LOADER_MS: Record<ProfileSection, number> = { description: 1200, audience: 900 };
/** Subline changes at 8 s, Retry appears at 30 s. */
const STAGES = [8000, 30000] as const;

/**
 * Body of an AI-written section: a named loader, then text that writes itself
 * in on a Signal rail (Rankoya's work), then a yes/no check. "No" swaps the text
 * for an editable copy of the markdown in place.
 */
export function AiSection({
  site,
  section,
  saved,
  onStatus,
  onWritten,
  onConfirm,
}: {
  site: Pick<Site, "name" | "domain">;
  section: ProfileSection;
  /** Text already written for this site, if any; it is shown as is. */
  saved: string | null;
  onStatus: (status: SectionStatus) => void;
  /** Called once the whole text has arrived, to save it. */
  onWritten: (text: string) => void;
  onConfirm: (text: string) => void;
}) {
  const t = useTranslations("siteSetup.details");
  const [instant] = React.useState(saved !== null);
  const [editing, setEditing] = React.useState<string | null>(null);
  const stream = useTextStream((signal) => streamProfileSection(site, section, signal));
  const { start } = stream;

  React.useEffect(() => {
    if (!instant) void start();
  }, [instant, start]);

  const arriving = stream.state === "streaming" || stream.state === "done";
  // Early chunks are held back until the loader has had its minimum time.
  const released = useMinDuration(!instant, arriving, MIN_LOADER_MS[section]);
  const target = instant ? (saved ?? "") : released ? stream.text : "";
  const { visible, isCatchingUp } = useSmoothText(target, { done: instant || stream.state === "done" });

  const writtenRef = React.useRef(false);
  React.useEffect(() => {
    if (stream.state === "done" && !writtenRef.current) {
      writtenRef.current = true;
      onWritten(stream.text);
    }
  }, [stream.state, stream.text, onWritten]);

  const text = instant ? (saved ?? "") : stream.text;
  const status: SectionStatus =
    editing !== null
      ? "editing"
      : instant
        ? "review"
        : !released
          ? "loading"
          : stream.state !== "done" || isCatchingUp
            ? "streaming"
            : "review";
  const error = stream.state === "error";

  React.useEffect(() => onStatus(error ? "idle" : status), [status, error, onStatus]);

  const stage = useElapsedStage(status === "loading" && !error, STAGES);
  useStickToBottom(status === "streaming", visible.length);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 border-s-[3px] border-danger px-6 py-5">
        <p className="text-body-lg text-fg">{t("error")}</p>
        <Button variant="secondary" onClick={() => void start()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative border-s-[3px] border-signal/70 px-6 py-5">
        {status === "loading" ? (
          <div className="flex flex-col items-start gap-3">
            <LoaderLines
              title={t(`loader.${section}.title`)}
              subline={
                stage === 0 ? t("loader.subline") : stage === 1 ? t(`loader.${section}.slow`) : t("loader.stuck")
              }
            />
            {stage === 2 && (
              <Button variant="secondary" size="sm" onClick={() => void start()}>
                {t("retry")}
              </Button>
            )}
          </div>
        ) : editing !== null ? (
          <Textarea
            aria-label={t("editLabel", { section: t(`sections.${section}`) })}
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            autoFocus
            className="field-sizing-content min-h-60 font-mono text-small"
          />
        ) : (
          <>
            <QuoteIcon
              aria-hidden
              className="pointer-events-none absolute end-4 top-4 size-8 fill-signal/15 text-signal/25"
            />
            <StreamedMarkdown text={visible} writing={status === "streaming"} className="pe-8" />
          </>
        )}
      </div>

      {(status === "review" || status === "editing") && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.base, ease: ease.out }}
          className="flex flex-col gap-3 px-6 pt-5 pb-6"
        >
          {editing !== null ? (
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                variant="primary"
                size="lg"
                className="sm:flex-1"
                disabled={!editing.trim()}
                onClick={() => onConfirm(editing.trim())}
              >
                {t("save")}
              </Button>
              <Button variant="secondary" size="lg" className="sm:flex-1" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-2 text-body-lg text-fg">{t(`review.${section}`)}</p>
              <Button variant="primary" size="lg" onClick={() => onConfirm(text)}>
                {t("yes")}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setEditing(text)}>
                {t("no")}
              </Button>
            </>
          )}
        </motion.div>
      )}
    </>
  );
}
