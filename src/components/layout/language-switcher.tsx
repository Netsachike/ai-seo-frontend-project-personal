"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { enabledLocales, localeMeta, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/features/preferences/use-preferences";
import {
  clearPageTranslation,
  GOOGLE_LANGUAGES,
  googleLanguage,
  readGoogleLanguage,
  rememberGoogleLanguage,
  translatePageTo,
} from "@/features/translate/google-translate";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** What the menu can pick: one of Rankoya's own languages, or a machine-translated one. */
export type LanguageChoice = { kind: "locale"; locale: Locale } | { kind: "google"; code: string };

/** The machine language in use, read after mount (the cookie is browser-only). */
function useGoogleLanguage() {
  return React.useSyncExternalStore(
    () => () => {},
    () => readGoogleLanguage(),
    () => null,
  );
}

/**
 * Applies a choice. Rankoya's languages switch the UI (and drop any machine
 * translation); the others keep the UI in English and let Google translate it.
 */
export function useLanguageChoice({ persist = true }: { persist?: boolean } = {}) {
  const locale = useLocale() as Locale;
  const { setLocale } = usePreferences({ persist });
  return (choice: LanguageChoice) => {
    if (choice.kind === "locale") {
      const hadTranslation = clearPageTranslation({ reload: false });
      if (choice.locale !== locale) setLocale(choice.locale);
      else if (hadTranslation) window.location.reload();
      return;
    }
    // Google translates from English, so the UI goes back to English first.
    if (locale !== "en") {
      setLocale("en");
      rememberGoogleLanguage(choice.code);
      window.location.reload();
      return;
    }
    translatePageTo(choice.code);
  };
}

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
  const google = googleLanguage(useGoogleLanguage());
  const [open, setOpen] = React.useState(false);
  const choose = useLanguageChoice({ persist });
  const meta = google ?? localeMeta[locale];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("trigger", { language: meta.native })}
        data-tour="language"
        // Google must not translate the language names themselves.
        translate="no"
        className={cn(
          "notranslate flex h-9 items-center gap-1.5 rounded-md px-2 text-small font-medium text-fg-2 hover:bg-surface-2 hover:text-fg aria-expanded:bg-surface-2",
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
            <span lang={google?.code ?? locale}>{meta.native}</span>
          </>
        )}
        <ChevronDownIcon aria-hidden className="size-3.5 text-fg-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <LanguageList
          onSelect={(choice) => {
            setOpen(false);
            choose(choice);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function LanguageList({ onSelect }: { onSelect: (choice: LanguageChoice) => void }) {
  const t = useTranslations("shell.language");
  const locale = useLocale();
  const google = useGoogleLanguage();
  return (
    <Command loop translate="no" className="notranslate">
      <CommandInput placeholder={t("search")} />
      <CommandList className="max-h-80">
        <CommandEmpty>{t("empty")}</CommandEmpty>
        <CommandGroup heading={t("heading")}>
          {enabledLocales.map((l) => (
            <CommandItem
              key={l}
              value={`${localeMeta[l].native} ${localeMeta[l].english} ${l}`}
              onSelect={() => onSelect({ kind: "locale", locale: l })}
              className="min-h-12"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span lang={l} className="truncate text-small font-medium text-fg">
                  {localeMeta[l].native}
                </span>
                <span className="truncate text-caption font-normal text-fg-3">{localeMeta[l].english}</span>
              </span>
              {l === locale && !google && <CheckIcon aria-hidden className="size-4 text-fg!" />}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={t("machineHeading")}>
          <p className="px-2 pb-1.5 text-caption font-normal text-fg-3">{t("machineNote")}</p>
          {GOOGLE_LANGUAGES.map((l) => (
            <CommandItem
              key={l.code}
              value={`${l.native} ${l.english} ${l.code}`}
              onSelect={() => onSelect({ kind: "google", code: l.code })}
              className="min-h-12"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span lang={l.code} className="truncate text-small font-medium text-fg">
                  {l.native}
                </span>
                <span className="truncate text-caption font-normal text-fg-3">{l.english}</span>
              </span>
              {l.code === google && <CheckIcon aria-hidden className="size-4 text-fg!" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
