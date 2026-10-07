"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, LaptopIcon, MessageCircleIcon, MoonIcon, SunIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { enabledLocales, localeMeta, type Locale } from "@/i18n/config";
import { useUiStore } from "@/lib/store/ui";
import { usePreferences } from "@/features/preferences/use-preferences";
import { useBrands, useSwitchBrand, useSwitchWorkspace } from "@/features/workspace/hooks";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Command,
} from "@/components/ui/command";
import { EntityAvatar } from "./avatars";
import { useSessionUser } from "@/features/account/use-session-user";
import { navGroups, navItemHref } from "./nav";
import { useShell } from "./shell-context";

/** ⌘K / Ctrl+K from anywhere in the app. */
function useCommandHotkey() {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const { commandOpen, setCommandOpen } = useUiStore.getState();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * Screens, workspaces, brands, language and theme. Anything that doesn't
 * match is handed to Orbit as a question.
 */
export function CommandMenu() {
  const t = useTranslations("shell.command");
  const tNav = useTranslations("shell.nav");
  const tTheme = useTranslations("shell.theme");
  const router = useRouter();
  const locale = useLocale() as Locale;
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const [query, setQuery] = React.useState("");
  const { brandSlug, brand, workspace, workspaces } = useShell();
  const session = useSessionUser();
  const brands = useBrands(workspace?.id);
  const switchBrand = useSwitchBrand();
  const switchWorkspace = useSwitchWorkspace();
  const { theme, setTheme, setLocale } = usePreferences();
  useCommandHotkey();

  const run = (action: () => void) => {
    setOpen(false);
    setQuery("");
    action();
  };

  const question = query.trim();

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title={t("title")}
      description={t("description")}
    >
      <Command loop>
        <CommandInput value={query} onValueChange={setQuery} placeholder={t("placeholder")} />
        <CommandList>
          <CommandEmpty>{t("empty")}</CommandEmpty>
          {question && (
            <CommandGroup heading={t("askGroup")} forceMount>
              <CommandItem
                forceMount
                value="__ask"
                onSelect={() => run(() => useUiStore.getState().askOrbit(question))}
              >
                <MessageCircleIcon />
                <span className="min-w-0 flex-1 truncate">{t("ask", { question })}</span>
                <CommandShortcut>{t("enter")}</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}
          {navGroups.map((group) => (
            <CommandGroup key={group.key} heading={tNav(`groups.${group.key}`)}>
              {group.items.filter((item) => !item.visible || item.visible(session)).map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.key}
                    value={`nav ${tNav(`items.${item.key}`)}`}
                    onSelect={() => run(() => router.push(navItemHref(item, brandSlug)))}
                  >
                    <Icon />
                    {tNav(`items.${item.key}`)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          {brands.data && brands.data.length > 1 && (
            <CommandGroup heading={t("brands")}>
              {brands.data.map((b) => (
                <CommandItem
                  key={b.id}
                  value={`brand ${b.name} ${b.domain}`}
                  onSelect={() => run(() => b.id !== brand?.id && switchBrand(b))}
                >
                  <EntityAvatar name={b.name} size={20} />
                  <span className="min-w-0 flex-1 truncate">{t("switchTo", { name: b.name })}</span>
                  {b.id === brand?.id && <CheckIcon className="text-fg!" />}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {workspaces.length > 1 && (
            <CommandGroup heading={t("workspaces")}>
              {workspaces.map((w) => (
                <CommandItem
                  key={w.id}
                  value={`workspace ${w.name}`}
                  onSelect={() => run(() => w.id !== workspace?.id && void switchWorkspace(w))}
                >
                  <EntityAvatar name={w.name} size={20} />
                  <span className="min-w-0 flex-1 truncate">{t("switchTo", { name: w.name })}</span>
                  {w.id === workspace?.id && <CheckIcon className="text-fg!" />}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading={t("theme")}>
            {(
              [
                ["light", SunIcon, tTheme("light")],
                ["dark", MoonIcon, tTheme("dark")],
                ["system", LaptopIcon, tTheme("system")],
              ] as const
            ).map(([value, Icon, label]) => (
              <CommandItem key={value} value={`theme ${label}`} onSelect={() => run(() => setTheme(value))}>
                <Icon />
                <span className="flex-1">{t("themeItem", { theme: label })}</span>
                {theme === value && <CheckIcon className="text-fg!" />}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t("language")}>
            {enabledLocales.map((l) => (
              <CommandItem
                key={l}
                value={`language ${localeMeta[l].native} ${localeMeta[l].english}`}
                onSelect={() => run(() => l !== locale && setLocale(l))}
              >
                <span className="w-6 num text-caption text-fg-3">{localeMeta[l].short}</span>
                <span lang={l} className="flex-1">
                  {localeMeta[l].native}
                </span>
                {l === locale && <CheckIcon className="text-fg!" />}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
