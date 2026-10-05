"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { enabledLocales, localeMeta, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/features/preferences/use-preferences";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * "EN · English". Languages are listed by native name with the English name
 * beneath. No flags: languages are not countries.
 */
export function LanguageSwitcher({
  persist = true,
  compact = false,
  className,
}: {
  persist?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("shell.language");
  const locale = useLocale() as Locale;
  const [open, setOpen] = React.useState(false);
  const { setLocale } = usePreferences({ persist });
  const meta = localeMeta[locale];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("trigger", { language: meta.native })}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-md px-2 text-small font-medium text-fg-2 hover:bg-surface-2 hover:text-fg aria-expanded:bg-surface-2",
          className,
        )}
      >
        <LanguagesIcon aria-hidden className="size-4 stroke-[1.5]" />
        <span className="num">{meta.short}</span>
        {!compact && (
          <>
            <span aria-hidden className="text-fg-3">
              ·
            </span>
            <span lang={locale}>{meta.native}</span>
          </>
        )}
        <ChevronDownIcon aria-hidden className="size-3.5 text-fg-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <LanguageList
          onSelect={(next) => {
            setOpen(false);
            if (next !== locale) setLocale(next);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function LanguageList({ onSelect }: { onSelect: (locale: Locale) => void }) {
  const t = useTranslations("shell.language");
  const locale = useLocale();
  return (
    <Command loop>
      <CommandInput placeholder={t("search")} />
      <CommandList className="max-h-72">
        <CommandEmpty>{t("empty")}</CommandEmpty>
        <CommandGroup heading={t("heading")}>
          {enabledLocales.map((l) => (
            <CommandItem
              key={l}
              value={`${localeMeta[l].native} ${localeMeta[l].english} ${l}`}
              onSelect={() => onSelect(l)}
              className="min-h-12"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span lang={l} className="truncate text-small font-medium text-fg">
                  {localeMeta[l].native}
                </span>
                <span className="truncate text-caption font-normal text-fg-3">{localeMeta[l].english}</span>
              </span>
              {l === locale && <CheckIcon aria-hidden className="size-4 text-fg!" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
