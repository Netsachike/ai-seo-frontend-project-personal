"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  CreditCardIcon,
  LanguagesIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MessageSquarePlusIcon,
  MoonIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { enabledLocales, localeMeta, type Locale } from "@/i18n/config";
import { endSession } from "@/lib/auth/session";
import { useMounted } from "@/lib/hooks/use-mounted";
import { usePreferences } from "@/features/preferences/use-preferences";
import { useUsage } from "@/features/workspace/hooks";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "./avatars";
import { brandHref } from "./nav";
import { useShell } from "./shell-context";

export function useSignOut() {
  const queryClient = useQueryClient();
  return () => {
    endSession();
    queryClient.clear();
    // full reload: drops every in-memory cache and re-runs proxy.ts
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/sign-in");
  };
}

export function ProfileMenu() {
  const t = useTranslations("shell.profile");
  const tRole = useTranslations("roles");
  const format = useFormatter();
  const router = useRouter();
  const locale = useLocale() as Locale;
  const mounted = useMounted();
  const { me, workspace, brandSlug, openHelp, openFeedback } = useShell();
  const usage = useUsage(workspace?.id);
  const { resolvedTheme, setTheme, setLocale } = usePreferences();
  const signOut = useSignOut();
  const darkSwitchId = React.useId();

  if (!me || !workspace) return <UserAvatar name="" size={32} className="opacity-40" />;

  const go = (path: string) => router.push(brandHref(brandSlug, path));
  const dark = mounted && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("trigger", { name: me.name })}
        className="rounded-full ring-offset-2 ring-offset-surface aria-expanded:ring-2 aria-expanded:ring-border-strong"
      >
        <UserAvatar name={me.name} src={me.avatarUrl} size={32} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2 py-2.5">
          <UserAvatar name={me.name} src={me.avatarUrl} size={36} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-small font-semibold text-fg">{me.name}</span>
            <span dir="ltr" className="truncate text-start text-caption font-normal text-fg-3">
              {me.email}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
          <Badge variant="neutral">{tRole(workspace.role)}</Badge>
          <Badge variant="outline">{t("plan", { plan: workspace.plan.name })}</Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => go("settings/profile")}>
            <UserIcon />
            {t("profile")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go("settings/billing")}>
            <CreditCardIcon />
            {t("billing")}
            {usage.data && (
              <DropdownMenuShortcut className="num text-[12px]">
                {format.number(usage.data.credits.remaining, "integer")}
              </DropdownMenuShortcut>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go("settings/team")}>
            <UsersIcon />
            {t("team")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setTheme(dark ? "light" : "dark");
            }}
          >
            <MoonIcon />
            <label htmlFor={darkSwitchId} className="flex-1">
              {t("darkMode")}
            </label>
            <Switch id={darkSwitchId} checked={dark} tabIndex={-1} aria-hidden className="pointer-events-none" />
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LanguagesIcon />
              <span className="flex-1">{t("language")}</span>
              <span lang={locale} className="text-caption font-normal text-fg-3">
                {localeMeta[locale].native}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                {enabledLocales.map((l) => (
                  <DropdownMenuRadioItem key={l} value={l} className="min-h-11">
                    <span className="flex flex-col">
                      <span lang={l}>{localeMeta[l].native}</span>
                      <span className="text-caption font-normal text-fg-3">{localeMeta[l].english}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={openHelp}>
            <LifeBuoyIcon />
            {t("help")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openFeedback}>
            <MessageSquarePlusIcon />
            {t("feedback")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOutIcon className="rtl:-scale-x-100" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
