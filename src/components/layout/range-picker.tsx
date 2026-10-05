"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";

import { dateLocale } from "@/lib/date-locale";
import { cn } from "@/lib/utils";
import { useRange } from "@/features/insights/url-state";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** 7, 30 and 90 days plus a custom range, all synced to the URL. */
export function RangePicker({ className }: { className?: string }) {
  const t = useTranslations("insights.range");
  const format = useFormatter();
  const locale = useLocale();
  const { range, from, to, setPreset, setCustom } = useRange();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(from && to ? { from, to } : undefined);

  const customLabel =
    range === "custom" && from && to ? format.dateTimeRange(from, to, { month: "short", day: "numeric" }) : t("custom");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Tabs value={range === "custom" ? "" : range} onValueChange={(v) => setPreset(v as "7d" | "30d" | "90d")}>
        <TabsList variant="segmented" aria-label={t("label")}>
          <TabsTrigger value="7d">{t("7d")}</TabsTrigger>
          <TabsTrigger value="30d">{t("30d")}</TabsTrigger>
          <TabsTrigger value="90d">{t("90d")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={range === "custom" ? "primary" : "secondary"}
            size="sm"
            className="h-8"
            aria-label={range === "custom" ? t("customAria", { range: customLabel }) : t("custom")}
          >
            <CalendarIcon />
            <span className={cn("hidden sm:inline", range === "custom" && "num")}>{customLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-3">
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={draft}
            onSelect={setDraft}
            locale={dateLocale(locale)}
            disabled={{ after: new Date() }}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="text-caption font-normal text-fg-3">{t("maxNote")}</span>
            <Button
              size="sm"
              variant="primary"
              disabled={!draft?.from || !draft?.to}
              onClick={() => {
                if (draft?.from && draft.to) setCustom(draft.from, draft.to);
                setOpen(false);
              }}
            >
              {t("apply")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
