"use client";

import * as React from "react";
import { MailIcon, MessageSquareTextIcon, PlayIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";

import {
  HELP_CATEGORIES,
  HELP_EMAILS,
  HELP_SOCIALS,
  normalizeHelpTab,
  videosIn,
  type HelpVideo,
} from "@/features/help/content";
import { useBrandConfig } from "@/components/providers/brand-provider";
import { useShell } from "@/components/layout/shell-context";
import { PageHeader } from "@/components/layout/page-header";
import { CopyButton } from "@/components/brand/copy-button";
import { VideoDialog } from "@/components/help/video-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Demo videos by area of the app, and every way to reach the team. The tab is kept in `?tab=`. */
export function HelpView() {
  const t = useTranslations("help");
  const [tabParam, setTabParam] = useQueryState("tab");
  const tab = normalizeHelpTab(tabParam);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs value={tab} onValueChange={(next) => void setTabParam(next === "videos" ? null : next)} className="gap-6">
        <TabsList aria-label={t("tabsLabel")}>
          <TabsTrigger value="videos">{t("tabs.videos")}</TabsTrigger>
          <TabsTrigger value="contact">{t("tabs.contact")}</TabsTrigger>
        </TabsList>
        <TabsContent value="videos">
          <VideosTab />
        </TabsContent>
        <TabsContent value="contact">
          <ContactTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VideosTab() {
  const t = useTranslations("help.videos");
  const [playing, setPlaying] = React.useState<HelpVideo | null>(null);

  return (
    <div className="flex flex-col gap-8">
      {HELP_CATEGORIES.map((category) => {
        const videos = videosIn(category);
        return (
          <section key={category} aria-labelledby={`help-${category}`} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id={`help-${category}`} className="text-h2 text-fg">
                {t(`categories.${category}.title`)}
              </h2>
              <p className="text-small text-fg-2">{t(`categories.${category}.description`)}</p>
            </div>
            {videos.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {videos.map((video) => (
                  <li key={video.id} className="flex">
                    <VideoCard video={video} onPlay={() => setPlaying(video)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-small text-fg-3">
                {t("empty")}
              </p>
            )}
          </section>
        );
      })}
      <VideoDialog video={playing} open={playing !== null} onOpenChange={(open) => !open && setPlaying(null)} />
    </div>
  );
}

function VideoCard({ video, onPlay }: { video: HelpVideo; onPlay: () => void }) {
  const t = useTranslations("help.videos");
  const msg = (key: string) => `items.${video.id}.${key}` as Parameters<typeof t>[0];
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface text-start shadow-card transition-[border-color,box-shadow] duration-200 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <span className="relative block aspect-video w-full bg-surface-2">
        {/* The first frame as a thumbnail: metadata only, no sound, not focusable. */}
        <video
          src={`${video.src}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none size-full object-cover"
        />
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-black/10 transition-colors duration-200 group-hover:bg-black/25"
        >
          <span className="grid size-12 place-items-center rounded-full bg-white/95 text-black shadow-md transition-transform duration-200 group-hover:scale-105">
            <PlayIcon className="size-5 translate-x-px fill-current" />
          </span>
        </span>
      </span>
      <span className="flex flex-col gap-1 p-4">
        <span className="text-h3 text-fg">{t(msg("title"))}</span>
        <span className="text-small text-fg-2">{t(msg("description"))}</span>
      </span>
    </button>
  );
}

function ContactTab() {
  const t = useTranslations("help.contact");
  const { openHelp } = useShell();
  const { brandConfig } = useBrandConfig();
  const socials = HELP_SOCIALS.filter((s) => s.url);
  // A white-label workspace's own support address replaces Rankoya's.
  const emails = HELP_EMAILS.map((e) =>
    e.id === "support" && brandConfig.support_email ? { ...e, email: brandConfig.support_email } : e,
  );

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="help-email" className="flex flex-col gap-3">
        <h2 id="help-email" className="text-h2 text-fg">
          {t("emailTitle")}
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {emails.map((item) => (
            <li key={item.id} className="flex">
              <Card className="w-full gap-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2"
                  >
                    <MailIcon className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="text-h3 text-fg">{t(`emails.${item.id}.title`)}</h3>
                    <p className="text-small text-fg-2">{t(`emails.${item.id}.body`)}</p>
                    <a
                      dir="ltr"
                      href={`mailto:${item.email}`}
                      className="truncate text-start text-small text-blue underline"
                    >
                      {item.email}
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <a href={`mailto:${item.email}`}>
                      <MailIcon />
                      {t("sendEmail")}
                    </a>
                  </Button>
                  <CopyButton value={item.email} label={t("copyEmail")} variant="ghost" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="help-message">
        <Card className="flex-row flex-wrap items-center gap-4">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2">
            <MessageSquareTextIcon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
            <h2 id="help-message" className="text-h3 text-fg">
              {t("messageTitle")}
            </h2>
            <p className="text-small text-fg-2">{t("messageBody")}</p>
          </div>
          <Button variant="primary" onClick={openHelp}>
            {t("messageCta")}
          </Button>
        </Card>
      </section>

      {socials.length > 0 && (
        <section aria-labelledby="help-socials" className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id="help-socials" className="text-h2 text-fg">
              {t("socialsTitle")}
            </h2>
            <p className="text-small text-fg-2">{t("socialsBody")}</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {socials.map((social) => (
              <li key={social.id}>
                <Button asChild variant="secondary">
                  <a href={social.url} target="_blank" rel="noreferrer">
                    {t(`socials.${social.id}`)}
                    <SquareArrowOutUpRightIcon className="rtl:-scale-x-100" />
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
