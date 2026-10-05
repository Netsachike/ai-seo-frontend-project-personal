"use client";

import { MenuIcon, MessageCircleIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useUiStore } from "@/lib/store/ui";
import { Button } from "@/components/ui/button";
import { ContextSwitcher } from "./context-switcher";
import { CreditsChip } from "./credits-chip";
import { Shortcut } from "./kbd";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationsPopover } from "./notifications-popover";
import { ProfileMenu } from "./profile-menu";
import { useShell } from "./shell-context";
import { ThemeToggle } from "./theme-toggle";

/** 56px, sticky. Under md, credits, language and theme move into the profile menu. */
export function Topbar() {
  const t = useTranslations("shell.topbar");
  const { openMobileNav } = useShell();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const agentOpen = useUiStore((s) => s.agentPanelOpen);
  const setAgentOpen = useUiStore((s) => s.setAgentPanelOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-surface/95 px-2 backdrop-blur-sm sm:gap-2 md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openNav")} onClick={openMobileNav}>
        <MenuIcon />
      </Button>
      <ContextSwitcher />
      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="hidden h-9 w-60 items-center gap-2 rounded-md border border-border bg-bg px-2.5 text-small text-fg-3 hover:border-border-strong lg:flex"
      >
        <SearchIcon aria-hidden className="size-4" />
        <span className="flex-1 truncate text-start">{t("search")}</span>
        <Shortcut letter="K" className="rounded-sm border border-border-strong bg-surface px-1 text-fg-2" />
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={t("search")}
        onClick={() => setCommandOpen(true)}
      >
        <SearchIcon />
      </Button>

      <CreditsChip className="hidden md:flex" />
      <LanguageSwitcher compact className="hidden md:flex" />
      <ThemeToggle className="hidden md:inline-flex" />
      <NotificationsPopover />

      <Button
        variant="agent"
        size="icon"
        className="sm:hidden"
        aria-label={t("askOrbit")}
        aria-expanded={agentOpen}
        onClick={() => setAgentOpen(!agentOpen)}
      >
        <MessageCircleIcon />
      </Button>
      <Button
        variant="agent"
        className="hidden h-9 ps-3 pe-2.5 sm:inline-flex"
        aria-expanded={agentOpen}
        onClick={() => setAgentOpen(!agentOpen)}
      >
        <MessageCircleIcon />
        {t("askOrbit")}
        <Shortcut letter="J" className="opacity-70" />
      </Button>

      <div className="ms-1">
        <ProfileMenu />
      </div>
    </header>
  );
}
