"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { AgentMessage } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { OrbitAvatar } from "@/components/brand/logo";
import { ApprovalCard } from "./approval-card";
import { Markdown } from "./markdown";
import { TaskRow } from "./task-row";

export function Message({
  message,
  dense = false,
  streaming = false,
}: {
  message: AgentMessage;
  /** Tighter type for the 400px panel. */
  dense?: boolean;
  streaming?: boolean;
}) {
  const t = useTranslations("agent");
  const format = useFormatter();
  const time = format.dateTime(new Date(message.createdAt), "time");

  if (message.role === "user") {
    return (
      <div className="flex max-w-[85%] flex-col items-end gap-1 self-end">
        <div
          className={cn(
            "rounded-[14px] rounded-ee-[4px] bg-surface-2 px-3.5 py-2.5 text-fg",
            dense ? "text-body" : "text-body-lg",
          )}
        >
          {/* Message text can be in any language; let the browser pick its direction. */}
          <p dir="auto" className="break-words whitespace-pre-wrap">
            {message.body}
          </p>
        </div>
        <span className="text-[11px] leading-4 text-fg-3">
          <span className="num">{time}</span>
          {message.source === "telegram" && <> · {t("fromTelegram")}</>}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <OrbitAvatar size={dense ? 24 : 30} />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-3 text-fg", dense ? "text-body" : "text-body-lg")}>
        <span className="sr-only">{t("orbitSaid")}</span>
        <Markdown>{message.body}</Markdown>
        {streaming && <span aria-hidden className="inline-block h-4 w-1.5 animate-pulse rounded-[1px] bg-fg-3" />}
        {message.approval && <ApprovalCard approval={message.approval} />}
        {message.task && <TaskRow task={message.task} />}
      </div>
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function DayDivider({ date, now = new Date(), note }: { date: Date; now?: Date; note?: string }) {
  const format = useFormatter();
  const t = useTranslations("agent");
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOf(now) - startOf(date)) / DAY_MS);
  const day =
    daysAgo === 0
      ? t("today")
      : daysAgo === 1
        ? t("yesterday")
        : format.dateTime(date, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-bg px-2.5 py-0.5 text-caption font-normal text-fg-3">
        {note ? t("dayDividerWithNote", { day, note }) : day}
      </span>
    </div>
  );
}
