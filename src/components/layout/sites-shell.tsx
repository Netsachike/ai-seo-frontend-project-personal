"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { useMe, useWorkspaces } from "@/features/workspace/hooks";
import { FeedbackDialog, HelpSheet } from "./help-sheet";
import { ShellProvider, type ShellValue } from "./shell-context";
import { Topbar } from "./topbar";

/**
 * Frame for the sites page: the same top bar as the app, without the
 * sidebar, since no site is open yet. The active workspace is the one the
 * backend has active.
 */
export function SitesShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("shell");
  const me = useMe();
  const workspaces = useWorkspaces();
  const [help, setHelp] = React.useState(false);
  const [feedback, setFeedback] = React.useState(false);
  const list = workspaces.data?.list ?? [];
  const workspace = workspaces.data?.active;

  const value: ShellValue = {
    brandSlug: "",
    brand: undefined,
    workspace,
    workspaces: list,
    me: me.data,
    collapsed: false,
    setCollapsed: () => {},
    openMobileNav: () => {},
    openHelp: () => setHelp(true),
    openFeedback: () => setFeedback(true),
  };

  return (
    <ShellProvider value={value}>
      <a
        href="#main"
        className="fixed start-3 top-3 z-[60] -translate-y-20 rounded-md bg-ink px-3 py-2 text-small font-medium text-ink-fg focus-visible:translate-y-0"
      >
        {t("skipToContent")}
      </a>
      <div className="flex min-h-dvh flex-col bg-bg">
        <Topbar variant="sites" />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 outline-none md:px-8 md:py-14"
        >
          {children}
        </main>
      </div>
      <HelpSheet open={help} onOpenChange={setHelp} />
      <FeedbackDialog open={feedback} onOpenChange={setFeedback} />
    </ShellProvider>
  );
}
