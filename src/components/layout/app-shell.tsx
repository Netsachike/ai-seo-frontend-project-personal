"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";

import { useUiStore } from "@/lib/store/ui";
import { useBrandLookup, useMe } from "@/features/workspace/hooks";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AgentPanel } from "@/components/agent/agent-panel";
import { AppSidebar, SidebarBrand, SidebarFooter, SidebarNav } from "./app-sidebar";
import { CommandMenu } from "./command-menu";
import { WorkspaceSwitcher } from "./context-switcher";
import { FeedbackDialog, HelpSheet } from "./help-sheet";
import { brandHref } from "./nav";
import { ShellProvider, type ShellValue } from "./shell-context";
import { Topbar } from "./topbar";

export function AppShell({
  brandSlug,
  initialCollapsed,
  children,
}: {
  brandSlug: string;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("shell");
  const me = useMe();
  const lookup = useBrandLookup(brandSlug);
  const storedCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [help, setHelp] = React.useState(false);
  const [feedback, setFeedback] = React.useState(false);

  if (lookup.notFound) notFound();

  const workspaceId = lookup.workspace?.id;
  // Runs before children's passive effects, so their first queries see the active workspace.
  React.useLayoutEffect(() => {
    const store = useUiStore.getState();
    if (workspaceId && store.workspaceId !== workspaceId) store.setWorkspace(workspaceId);
    if (lookup.brand && store.brandSlug !== brandSlug) store.setBrand(brandSlug);
  }, [workspaceId, brandSlug, lookup.brand]);

  const value: ShellValue = {
    brandSlug,
    brand: lookup.brand,
    workspace: lookup.workspace,
    workspaces: lookup.workspaces,
    me: me.data,
    collapsed: storedCollapsed ?? initialCollapsed,
    setCollapsed,
    openMobileNav: () => setMobileNav(true),
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
      <div className="flex min-h-dvh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none md:px-8 md:py-8"
          >
            {children}
          </main>
        </div>
      </div>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="start" className="dark gap-0 border-nav-border bg-nav text-nav-fg">
          <SheetTitle className="sr-only">{t("nav.label")}</SheetTitle>
          <SheetDescription className="sr-only">{t("mobileNavDescription")}</SheetDescription>
          <div className="flex items-center px-4 pt-5 pb-4">
            <SidebarBrand />
          </div>
          <div className="px-3 pb-3">
            <WorkspaceSwitcher full />
          </div>
          <SidebarNav className="flex-1 overflow-y-auto px-3 pb-4" onNavigate={() => setMobileNav(false)} />
          <SidebarFooter onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <CommandMenu />
      {workspaceId && <AgentPanel workspaceId={workspaceId} agentHref={brandHref(brandSlug, "agent")} />}
      <HelpSheet open={help} onOpenChange={setHelp} />
      <FeedbackDialog open={feedback} onOpenChange={setFeedback} />
    </ShellProvider>
  );
}
