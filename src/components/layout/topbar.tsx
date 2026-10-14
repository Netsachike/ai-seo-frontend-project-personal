"use client";

import Link from "next/link";
import { MenuIcon, MessageCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useUiStore } from "@/lib/store/ui";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { WorkspaceSwitcher } from "./context-switcher";
import { Shortcut } from "./kbd";
import { LanguageSwitcher } from "./language-switcher";
import { ProfileMenu } from "./profile-menu";
import { useShell } from "./shell-context";
import { ThemeToggle } from "./theme-toggle";

/**
 * 56px, sticky. Workspace on the start side; language, theme, notifications,
 * Ask Rankoya and the profile on the end side. Sites are chosen on the sites
 * page, not here. Under md, language and theme move into the profile menu.
 *
 * `sites`: the sites page has no sidebar, so the logo takes the menu button's place.
 */
export function Topbar({ variant = "app" }: { variant?: "app" | "sites" }) {
  const t = useTranslations("shell.topbar");
  const { openMobileNav } = useShell();
  const agentOpen = useUiStore((s) => s.agentPanelOpen);
  const setAgentOpen = useUiStore((s) => s.setAgentPanelOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-surface/95 px-2 backdrop-blur-sm sm:gap-2 md:px-6">
      {variant === "app" ? (
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openNav")} onClick={openMobileNav}>
          <MenuIcon />
        </Button>
      ) : (
        <>
          <Link href="/sites" aria-label={t("home")} className="rounded-md px-2">
            <Logo />
          </Link>
          <span aria-hidden className="text-fg-3">
            /
          </span>
        </>
      )}
      <WorkspaceSwitcher />
      <div className="flex-1" />

      <LanguageSwitcher compact className="hidden md:flex" />
      <ThemeToggle className="hidden md:inline-flex" />
      {/* No notifications endpoint yet; restore when the backend ships one. */}
      {/* <NotificationsPopover /> */}

      <Button
        variant="agent"
        size="icon"
        className="sm:hidden"
        aria-label={t("askRankoya")}
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
        {t("askRankoya")}
        <Shortcut letter="J" className="opacity-70" />
      </Button>

      <div className="ms-1">
        <ProfileMenu />
      </div>
    </header>
  );
}
