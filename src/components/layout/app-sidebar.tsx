"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, StarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { PlanTier } from "@/lib/api/types";
import { dirFor } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrbitMark, WORDMARK } from "@/components/brand/logo";
import { UserAvatar } from "./avatars";
import { activeNavKey, brandHref, navGroups, type NavItem } from "./nav";
import { useShell } from "./shell-context";

/** Tooltips sit on the inline-end side, which is physical left in RTL. */
function useEndSide(): "left" | "right" {
  return dirFor(useLocale()) === "rtl" ? "left" : "right";
}

const nextTier: Record<PlanTier, string> = { free: "Growth", growth: "Agency", agency: "Agency" };

/**
 * Navy panel in both themes. The `dark` class scopes dark-surface tokens to
 * everything inside, so nested controls read correctly on navy.
 * 248px, or 64px collapsed. Desktop only; under lg the same panel opens in a sheet.
 */
export function AppSidebar() {
  const t = useTranslations("shell.sidebar");
  const { collapsed, setCollapsed } = useShell();
  const ToggleIcon = collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "dark sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-nav-border bg-nav text-nav-fg transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-16" : "w-[248px]",
      )}
    >
      <div className={cn("flex shrink-0 items-start gap-2 px-4 pt-5 pb-4", collapsed && "justify-center px-0")}>
        {!collapsed && <SidebarBrand className="me-auto" />}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? t("expand") : t("collapse")}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className="text-nav-muted hover:bg-nav-hover hover:text-white"
        >
          <ToggleIcon className="rtl:-scale-x-100" />
        </Button>
      </div>
      <SidebarNav collapsed={collapsed} className="flex-1 overflow-y-auto px-3 pb-4" />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

/** Ring mark, wordmark and tagline, white on navy. */
export function SidebarBrand({ className }: { className?: string }) {
  const t = useTranslations("shell.sidebar");
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <OrbitMark size={30} className="text-white" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[20px] leading-6 font-semibold tracking-[-0.03em] text-white" translate="no">
          {WORDMARK}
        </span>
        <span className="truncate text-caption font-normal text-nav-muted">{t("tagline")}</span>
      </span>
    </span>
  );
}

/** The nav itself, shared by the desktop sidebar and the mobile sheet. One flat list, as in the reference. */
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
  const items = navGroups.flatMap((g) => g.items);

  return (
    <nav aria-label={t("label")} className={className}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
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
        "flex h-11 items-center gap-3 rounded-md px-3 text-body font-medium whitespace-nowrap text-nav-fg transition-colors duration-120",
        "hover:bg-nav-hover hover:text-white",
        "aria-[current=page]:bg-nav-active aria-[current=page]:font-semibold aria-[current=page]:text-white aria-[current=page]:shadow-[0_4px_12px_-4px_rgb(37_99_235/0.6)]",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon aria-hidden className="size-[18px] shrink-0 stroke-[1.75]" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && item.soon && (
        <span className="rounded-sm bg-nav-hover px-1.5 text-[11px] leading-4 font-semibold text-nav-muted">
          {t("soon")}
        </span>
      )}
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

  if (!me || !workspace) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className={cn("h-10", collapsed ? "mx-auto w-10" : "w-full")} />
      </div>
    );
  }

  const telegramOn = Boolean(me.telegram?.connected);
  const userLine = t("userLine", { role: tRole(workspace.role), plan: workspace.plan.name });

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 border-t border-nav-border py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={billing} aria-label={t("manageAria", { name: me.name })} className="relative rounded-full">
              <UserAvatar name={me.name} src={me.avatarUrl} />
              <TelegramDot on={telegramOn} className="absolute -end-0.5 -bottom-0.5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side={side}>{userLine}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {!workspace.plan.isTopTier && (
        <section className="flex flex-col gap-3 rounded-lg border border-nav-border bg-nav-card p-4">
          <div className="flex items-center gap-2">
            <StarIcon aria-hidden className="size-4 fill-nav-star text-nav-star" />
            <h2 className="text-h3 text-white">{t("upgradeTitle", { plan: nextTier[workspace.plan.tier] })}</h2>
          </div>
          <p className="text-small text-nav-fg">{t("upgradeBody")}</p>
          <Button asChild variant="agent" size="sm" className="w-full">
            <Link href={billing} onClick={onNavigate}>
              {t("viewPlans")}
            </Link>
          </Button>
        </section>
      )}

      <Link
        href={billing}
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-nav-hover"
      >
        <span className="relative">
          <UserAvatar name={me.name} src={me.avatarUrl} />
          <TelegramDot on={telegramOn} className="absolute -end-0.5 -bottom-0.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-small font-medium text-white" title={me.name}>
            {me.name}
          </span>
          <span className="truncate text-caption font-normal text-nav-muted">{userLine}</span>
        </span>
        <span className="sr-only">{telegramOn ? t("telegramOn") : t("telegramOff")}</span>
      </Link>
    </div>
  );
}

function TelegramDot({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2.5 rounded-full ring-2 ring-nav", on ? "bg-success" : "bg-nav-muted", className)}
    />
  );
}
