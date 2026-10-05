"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon, InboxIcon, ListChecksIcon, RadarIcon, UserPlusIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

import type { Engine, Notification } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useMarkAllRead, useNotifications } from "@/features/notifications/hooks";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { OrbitAvatar } from "@/components/brand/logo";
import { useShell } from "./shell-context";

export function NotificationsPopover() {
  const t = useTranslations("shell.notifications");
  const { workspace } = useShell();
  const notifications = useNotifications(workspace?.id);
  const markAll = useMarkAllRead(workspace?.id ?? "none");
  const [open, setOpen] = React.useState(false);
  const unread = notifications.data?.filter((n) => !n.read).length ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("trigger", { count: unread })} className="relative">
          <BellIcon />
          {unread > 0 && (
            <span aria-hidden className="absolute end-2.5 top-2.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] gap-0 p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-h3">{t("title")}</h2>
          <Button
            variant="link"
            size="sm"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {t("markAll")}
          </Button>
        </div>
        <div className="max-h-[min(440px,70dvh)] overflow-y-auto">
          {notifications.isPending && (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-7 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-11/12" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {notifications.isError && <p className="p-4 text-body text-danger">{t("error")}</p>}
          {notifications.data?.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <InboxIcon aria-hidden className="size-5 text-fg-3" />
              <p className="text-small font-medium text-fg">{t("emptyTitle")}</p>
              <p className="text-caption font-normal text-fg-3">{t("emptyDescription")}</p>
            </div>
          )}
          {notifications.data && notifications.data.length > 0 && (
            <ul className="flex flex-col p-1">
              {notifications.data.map((n) => (
                <li key={n.id}>
                  <NotificationRow notification={n} onNavigate={() => setOpen(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ notification: n, onNavigate }: { notification: Notification; onNavigate: () => void }) {
  const t = useTranslations("shell.notifications");
  const tEngine = useTranslations("engines");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const param = (key: string) => String(n.params[key] ?? "");

  const text = (() => {
    switch (n.kind) {
      case "approval_waiting":
        return t("kinds.approvalWaiting", { title: param("title") });
      case "agent_event":
        return t("kinds.agentEvent", { title: param("title"), site: param("site") });
      case "scan_finished":
        return t("kinds.scanFinished", {
          gained: Number(n.params.gained ?? 0),
          engine: tEngine(param("engine") as Engine),
        });
      case "team_invite":
        return t("kinds.teamInvite", { name: param("name") });
    }
  })();

  return (
    <Link
      href={n.href}
      onClick={onNavigate}
      className="flex items-start gap-3 rounded-[6px] px-3 py-2.5 hover:bg-surface-2"
    >
      <KindIcon kind={n.kind} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-small", n.read ? "text-fg-2" : "font-medium text-fg")}>{text}</span>
        <time dateTime={n.createdAt} className="text-caption font-normal text-fg-3">
          {format.relativeTime(new Date(n.createdAt), now)}
        </time>
      </span>
      {!n.read && (
        <>
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-blue" />
          <span className="sr-only">{t("unread")}</span>
        </>
      )}
    </Link>
  );
}

function KindIcon({ kind }: { kind: Notification["kind"] }) {
  if (kind === "agent_event") return <OrbitAvatar size={28} />;
  const Icon = kind === "approval_waiting" ? ListChecksIcon : kind === "scan_finished" ? RadarIcon : UserPlusIcon;
  return (
    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2">
      <Icon className="size-4 stroke-[1.5]" />
    </span>
  );
}
