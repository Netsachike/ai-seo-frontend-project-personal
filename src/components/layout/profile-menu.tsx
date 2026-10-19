"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BuildingIcon,
  CircleHelpIcon,
  CreditCardIcon,
  ShieldIcon,
  SparklesIcon,
  LanguagesIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MessageSquarePlusIcon,
  MoonIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { enabledLocales, localeMeta, type Locale } from "@/i18n/config";
import { endSession } from "@/lib/auth/session";
import { getTourForPath, isTourOnForPath, setTourOnForPath, TOUR_TOGGLE_EVENT } from "@/lib/tours";
import { GOOGLE_LANGUAGES, googleLanguage, readGoogleLanguage } from "@/features/translate/google-translate";
import { getActivePlan, isAdminSession } from "@/lib/plan-core";
import { useProfileImage } from "@/lib/profile-image";
import { accountHref } from "@/features/account/routes";
import { useSessionUser } from "@/features/account/use-session-user";
import { workspaceRole } from "@/features/workspace/hooks";
import { useMounted } from "@/lib/hooks/use-mounted";
import { usePreferences } from "@/features/preferences/use-preferences";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "./avatars";
import { useLanguageChoice } from "./language-switcher";
import { useShell } from "./shell-context";

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await endSession();
    queryClient.clear();
    // full reload: drops every in-memory cache and re-runs proxy.ts
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/sign-in");
  };
}

export function ProfileMenu() {
  const t = useTranslations("shell.profile");
  const tRole = useTranslations("roles");
  const tPlan = useTranslations("account.plans");
  const router = useRouter();
  const locale = useLocale() as Locale;
  const mounted = useMounted();
  const { me, workspace, openHelp, openFeedback } = useShell();
  const session = useSessionUser();
  const profileImage = useProfileImage();
  const plan = getActivePlan(session?.subscriptions);
  const { resolvedTheme, setTheme } = usePreferences();
  const signOut = useSignOut();
  const darkSwitchId = React.useId();
  const tourSwitchId = React.useId();
  const pathname = usePathname();
  const hasTour = getTourForPath(pathname) !== null;
  const tourOn = React.useSyncExternalStore(
    (onChange) => {
      window.addEventListener(TOUR_TOGGLE_EVENT, onChange);
      return () => window.removeEventListener(TOUR_TOGGLE_EVENT, onChange);
    },
    () => isTourOnForPath(pathname),
    () => false,
  );
  const chooseLanguage = useLanguageChoice();
  const google = React.useSyncExternalStore(
    () => () => {},
    () => readGoogleLanguage(),
    () => null,
  );
  const languageValue = google ? `g:${google}` : locale;

  if (!me || !workspace) return <UserAvatar name="" size={32} className="opacity-40" />;

  const go = (href: string) => router.push(href);
  const avatarSrc = profileImage ?? me.avatarUrl;
  const dark = mounted && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("trigger", { name: me.name })}
        className="rounded-full ring-offset-2 ring-offset-surface aria-expanded:ring-2 aria-expanded:ring-border-strong"
      >
        <UserAvatar name={me.name} src={avatarSrc} size={32} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2 py-2.5">
          <UserAvatar name={me.name} src={avatarSrc} size={36} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-small font-semibold text-fg">{me.name}</span>
            <span dir="ltr" className="truncate text-start text-caption font-normal text-fg-3">
              {me.email}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
          <Badge variant="neutral">{tRole(workspaceRole(workspace))}</Badge>
          <Badge variant="outline">{t("plan", { plan: tPlan(`${plan}.label`) })}</Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => go(accountHref.settings("profile"))}>
            <UserIcon />
            {t("profile")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go(accountHref.settings("subscriptions"))}>
            <CreditCardIcon />
            {t("billing")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go(accountHref.settings("workspaces"))}>
            <BuildingIcon />
            {t("workspaces")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go(accountHref.settings("team-members"))}>
            <UsersIcon />
            {t("team")}
          </DropdownMenuItem>
          {plan !== "reseller" && (
            <DropdownMenuItem onSelect={() => go(accountHref.upgrade())}>
              <SparklesIcon />
              {t("upgrade")}
            </DropdownMenuItem>
          )}
          {isAdminSession(session) && (
            <DropdownMenuItem onSelect={() => go(accountHref.admin())}>
              <ShieldIcon />
              {t("admin")}
            </DropdownMenuItem>
          )}
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
              <span lang={google ?? locale} translate="no" className="notranslate text-caption font-normal text-fg-3">
                {googleLanguage(google)?.native ?? localeMeta[locale].native}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent translate="no" className="notranslate max-h-80 w-60 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={languageValue}
                onValueChange={(v) =>
                  chooseLanguage(
                    v.startsWith("g:") ? { kind: "google", code: v.slice(2) } : { kind: "locale", locale: v as Locale },
                  )
                }
              >
                {enabledLocales.map((l) => (
                  <DropdownMenuRadioItem key={l} value={l} className="min-h-11">
                    <span className="flex flex-col">
                      <span lang={l}>{localeMeta[l].native}</span>
                      <span className="text-caption font-normal text-fg-3">{localeMeta[l].english}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-caption font-normal text-fg-3">
                  {t("machineLanguages")}
                </DropdownMenuLabel>
                {GOOGLE_LANGUAGES.map((l) => (
                  <DropdownMenuRadioItem key={l.code} value={`g:${l.code}`} className="min-h-11">
                    <span className="flex flex-col">
                      <span lang={l.code}>{l.native}</span>
                      <span className="text-caption font-normal text-fg-3">{l.english}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {hasTour && (
            // Closes the menu on select, so it doesn't cover what the tour points at.
            <DropdownMenuItem
              role="menuitemcheckbox"
              aria-checked={tourOn}
              onSelect={() => setTourOnForPath(pathname, !tourOn)}
            >
              <CircleHelpIcon />
              <label htmlFor={tourSwitchId} className="flex-1">
                {t("tour")}
              </label>
              <Switch id={tourSwitchId} checked={tourOn} tabIndex={-1} aria-hidden className="pointer-events-none" />
            </DropdownMenuItem>
          )}
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
