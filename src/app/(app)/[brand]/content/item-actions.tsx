"use client";

import * as React from "react";
import { CalendarClockIcon, EllipsisIcon, KeyRoundIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { useRemoveItem, useRescheduleItem, useSwapKeyword, type CalendarEntry } from "@/features/content/hooks";
import { useKeywordsPage } from "@/features/topics/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Action = "reschedule" | "swap" | "remove";

/** Move a calendar item to another date, give it another keyword, or take it off the calendar. */
export function CalendarItemMenu({ siteId, entry }: { siteId: number; entry: CalendarEntry }) {
  const t = useTranslations("content.itemActions");
  const [action, setAction] = React.useState<Action | null>(null);
  const reschedule = useRescheduleItem(siteId);
  const swap = useSwapKeyword(siteId);
  const remove = useRemoveItem(siteId);
  const keywords = useKeywordsPage(siteId, 1);
  const [date, setDate] = React.useState(entry.date);
  const [time, setTime] = React.useState("");
  const [keywordId, setKeywordId] = React.useState<string>(entry.keywordId ? String(entry.keywordId) : "");
  const ids = React.useId();
  const close = () => setAction(null);
  const fail = (error: unknown) => toast.error(getErrorMessage(error, t("failed")));
  const done = (message: "rescheduled" | "swapped" | "removed") => {
    toast.success(t(message));
    close();
  };

  const confirm = () => {
    if (action === "reschedule") {
      reschedule.mutate(
        { itemId: entry.itemId, payload: { scheduled_date: date, scheduled_time: time || null } },
        { onSuccess: () => done("rescheduled"), onError: fail },
      );
    } else if (action === "swap" && keywordId) {
      swap.mutate(
        { itemId: entry.itemId, keywordId: Number(keywordId) },
        { onSuccess: () => done("swapped"), onError: fail },
      );
    } else if (action === "remove") {
      remove.mutate(entry.itemId, { onSuccess: () => done("removed"), onError: fail });
    }
  };
  const pending = reschedule.isPending || swap.isPending || remove.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={t("menu", { title: entry.title })}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAction("reschedule")}>
            <CalendarClockIcon />
            {t("reschedule")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction("swap")}>
            <KeyRoundIcon />
            {t("swap")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setAction("remove")}>
            <Trash2Icon />
            {t("remove")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={action !== null} onOpenChange={(o) => !o && !pending && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action ? t(`${action}Title`) : ""}</DialogTitle>
            <DialogDescription>{entry.title}</DialogDescription>
          </DialogHeader>
          {action === "reschedule" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${ids}-date`}>{t("date")}</Label>
                <Input id={`${ids}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${ids}-time`}>{t("time")}</Label>
                <Input id={`${ids}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          )}
          {action === "swap" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-keyword`}>{t("keyword")}</Label>
              <Select value={keywordId} onValueChange={setKeywordId}>
                <SelectTrigger id={`${ids}-keyword`}>
                  <SelectValue placeholder={t("keywordPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(keywords.data?.data ?? []).map((k) => (
                    <SelectItem key={k.id} value={String(k.id)}>
                      {k.keyword}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {action === "remove" && <p className="text-small text-fg-2">{t("removeBody")}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={close} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button
              variant={action === "remove" ? "destructive" : "primary"}
              onClick={confirm}
              loading={pending}
              disabled={(action === "swap" && !keywordId) || (action === "reschedule" && !date)}
            >
              {action ? t(`${action}Confirm`) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
