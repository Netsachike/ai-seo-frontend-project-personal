"use client";

import * as React from "react";
import { PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { HelpVideo } from "@/features/help/content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Plays one help video in a dialog, from the start, with the browser's own controls. */
export function VideoDialog({
  video,
  open,
  onOpenChange,
}: {
  video: HelpVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("help.videos");
  if (!video) return null;
  const msg = (key: string) => `items.${video.id}.${key}` as Parameters<typeof t>[0];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(960px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t(msg("title"))}</DialogTitle>
          <DialogDescription>{t(msg("description"))}</DialogDescription>
        </DialogHeader>
        {/* No captions file yet; the description above says what the video covers. */}
        <video
          key={video.src}
          src={video.src}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-md bg-black"
        />
      </DialogContent>
    </Dialog>
  );
}

/** A "Watch demo" button that opens the video. Used on integration cards. */
export function WatchDemoButton({ video, className }: { video: HelpVideo; className?: string }) {
  const t = useTranslations("help.videos");
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" className={cn(className)} onClick={() => setOpen(true)}>
        <PlayIcon />
        {t("watchDemo")}
      </Button>
      <VideoDialog video={video} open={open} onOpenChange={setOpen} />
    </>
  );
}
