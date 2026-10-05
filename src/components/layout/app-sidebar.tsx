"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, SendIcon, ZapIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { dirFor } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "@/components/brand/logo";
import { UserAvatar } from "./avatars";
import { activeNavKey, brandHref, navGroups, type NavItem } from "./nav";
import { useShell } from "./shell-context";

/** Tooltips sit on the inline-end side, which is physical left in RTL. */
function useEndSide(): "left" | "right" {
  return dirFor(useLocale()) === "rtl" ? "left" : "right";
}

/** 248px, or 64px collapsed. Desktop only; under lg the same nav opens in a sheet. */
export function AppSidebar() {
  const t = useTranslations("shell.sidebar");
  const { collapsed, setCollapsed } = useShell();
  const ToggleIcon = collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "group/sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-border bg-bg transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-16" : "w-[248px]",
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        {!collapsed && <Logo className="me-auto" />}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? t("expand") : t("collapse")}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ToggleIcon className="rtl:-scale-x-100" />
        </Button>
      </div>
      <SidebarNav collapsed={collapsed} className="flex-1 overflow-y-auto px-2 pb-4" />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

/** The nav itself, shared by the desktop sidebar and the mobile sheet. */
export function SidebarNav({
  collapsed = false,
  className,
  onNavigate,
}: {
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell.nav");
  const { brandSlug } = useShell();
  const active = activeNavKey(usePathname());

  return (
    <nav aria-label={t("label")} className={cn("flex flex-col gap-5", className)}>
      {navGroups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {collapsed ? (
            <div aria-hidden className="mx-3 mb-1.5 h-px bg-border" />
          ) : (
            <h2 className="px-3 pb-1.5 text-overline text-fg-3">{t(`groups.${group.key}`)}</h2>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.key}>
                <NavLink
                  item={item}
                  href={brandHref(brandSlug, item.key)}
                  active={item.key === active}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  href,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  href: string;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell.nav");
  const side = useEndSide();
  const label = t(`items.${item.key}`);
  const Icon = item.icon;

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "flex h-9 items-center gap-3 rounded-md px-3 text-body font-medium whitespace-nowrap text-fg-2 transition-colors duration-120",
        "hover:bg-surface-2 hover:text-fg",
        "aria-[current=page]:bg-surface aria-[current=page]:font-semibold aria-[current=page]:text-fg aria-[current=page]:shadow-raised",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon aria-hidden className={cn("size-[18px] shrink-0 stroke-[1.5]", active ? "text-fg" : "text-fg-3")} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && item.soon && <Badge variant="neutral">{t("soon")}</Badge>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side={side}>{item.soon ? t("labelSoon", { label }) : label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarFooter({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const t = useTranslations("shell.sidebar");
  const tRole = useTranslations("roles");
  const side = useEndSide();
  const { me, workspace, brandSlug } = useShell();
  const billing = brandHref(brandSlug, "settings/billing");
  const telegram = me?.telegram;

  if (!me || !workspace) {
    return (
      <div className="flex flex-col gap-3 border-t border-border p-3">
        <Skeleton className={cn("h-9", collapsed ? "mx-auto w-9" : "w-full")} />
      </div>
    );
  }

  const telegramText = telegram?.connected
    ? t("telegramConnected", { handle: telegram.handle ?? "" })
    : t("telegramOff");

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 border-t border-border py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={brandHref(brandSlug, "integrations")}
              aria-label={t("telegramTitle")}
              className="relative grid size-9 place-items-center rounded-md text-fg-2 hover:bg-surface-2"
            >
              <SendIcon aria-hidden className="size-[18px] stroke-[1.5] rtl:-scale-x-100" />
              <StatusDot connected={Boolean(telegram?.connected)} className="absolute end-1.5 top-1.5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side={side}>{telegramText}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={billing} aria-label={t("manageAria", { name: me.name })} className="rounded-full">
              <UserAvatar name={me.name} src={me.avatarUrl} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side={side}>
            {t("userLine", { role: tRole(workspace.role), plan: workspace.plan.name })}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border p-3">
      <Link
        href={brandHref(brandSlug, "integrations")}
        onClick={onNavigate}
        className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 shadow-card hover:border-border-strong"
      >
        <span className="flex items-center gap-2 text-small font-semibold text-fg">
          <StatusDot connected={Boolean(telegram?.connected)} />
          {t("telegramTitle")}
        </span>
        <span className="text-caption font-normal text-fg-2">
          {telegram?.connected
            ? t.rich("telegramConnectedRich", {
                handle: telegram.handle ?? "",
                mono: (chunks) => (
                  <span dir="ltr" className="font-mono">
                    {chunks}
                  </span>
                ),
              })
            : t("telegramOff")}
        </span>
      </Link>

      {!workspace.plan.isTopTier && (
        <Button asChild variant="secondary" size="sm" className="justify-start gap-2.5 ps-1.5">
          <Link href={billing} onClick={onNavigate}>
            <span aria-hidden className="grid size-5 place-items-center rounded-sm bg-signal text-signal-ink">
              <ZapIcon className="size-3" />
            </span>
            {t("upgrade")}
          </Link>
        </Button>
      )}

      <div className="flex items-center gap-2.5 px-1">
        <UserAvatar name={me.name} src={me.avatarUrl} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-small font-medium text-fg" title={me.name}>
            {me.name}
          </span>
          <span className="truncate text-caption font-normal text-fg-3">
            {t("userLine", { role: tRole(workspace.role), plan: workspace.plan.name })}
          </span>
        </div>
        <Link href={billing} onClick={onNavigate} className="shrink-0 text-caption text-blue hover:underline">
          {t("manage")}
        </Link>
      </div>
    </div>
  );
}

function StatusDot({ connected, className }: { connected: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", connected ? "bg-success" : "bg-border-strong", className)}
    />
  );
}
