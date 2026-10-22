"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRightIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SparklesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { dirFor } from "@/i18n/config";
import { getActivePlan, type PlanName } from "@/lib/plan-core";
import { accountHref } from "@/features/account/routes";
import { useSessionUser } from "@/features/account/use-session-user";
import { faviconFor } from "@/features/sites/site-utils";
import { workspaceRole } from "@/features/workspace/hooks";
import { useBrandConfig } from "@/components/providers/brand-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "@/components/brand/logo";
import { UserAvatar } from "./avatars";
import { SiteFavicon } from "./site-favicon";
import { activeNavKey, navGroups, navItemHref, type NavItem } from "./nav";
import { useShell } from "./shell-context";

/** Tooltips sit on the inline-end side, which is physical left in RTL. */
function useEndSide(): "left" | "right" {
  return dirFor(useLocale()) === "rtl" ? "left" : "right";
}

/** The plan the sidebar card sells; Enterprise (`reseller`) is the top tier. */
const nextPlan: Record<PlanName, PlanName | null> = {
  free: "professional",
  professional: "agency",
  agency: "reseller",
  reseller: null,
};

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
      <SidebarSite collapsed={collapsed} className={cn("px-3 pb-3", collapsed && "px-0")} />
      <SidebarNav collapsed={collapsed} className="flex-1 overflow-y-auto px-3 pb-4" />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

/** Logo and tagline, white on navy. On a White Label domain, the tenant's logo or name. */
export function SidebarBrand({ className }: { className?: string }) {
  const t = useTranslations("shell.sidebar");
  const { brandConfig, isCustomDomain } = useBrandConfig();

  if (isCustomDomain) {
    const mark = brandConfig.logo_url || brandConfig.logo_icon_url;
    return (
      <span className={cn("flex min-w-0 items-center gap-3", className)}>
        {mark ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant logos come from any origin
          <img src={mark} alt={brandConfig.brand_name} className="h-8 max-w-[180px] object-contain" />
        ) : (
          <span className="truncate text-[18px] leading-6 font-semibold tracking-[-0.02em] text-white">
            {brandConfig.brand_name}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Logo tone="onDark" height={28} />
      <span className="truncate text-caption font-normal text-nav-muted">{t("tagline")}</span>
    </span>
  );
}

/**
 * The site every screen below is about. Sites are picked on the sites page,
 * so this links back there rather than opening a dropdown.
 */
export function SidebarSite({
  collapsed = false,
  className,
  onNavigate,
}: {
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell.sidebar");
  const side = useEndSide();
  const { brand, noSite } = useShell();

  if (!brand && noSite) {
    const choose = (
      <Link
        href="/sites"
        onClick={onNavigate}
        aria-label={collapsed ? t("chooseSite") : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg border border-dashed border-nav-border p-2.5 text-small font-medium text-nav-fg transition-colors duration-120 hover:bg-nav-hover hover:text-white",
          collapsed && "mx-auto size-11 justify-center p-0",
        )}
      >
        <ArrowLeftRightIcon aria-hidden className="size-4 shrink-0" />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{t("chooseSite")}</span>}
      </Link>
    );
    return (
      <div className={className}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{choose}</TooltipTrigger>
            <TooltipContent side={side}>{t("chooseSite")}</TooltipContent>
          </Tooltip>
        ) : (
          choose
        )}
      </div>
    );
  }

  if (!brand) {
    return (
      <div className={className}>
        <Skeleton className={cn("h-14 bg-nav-card", collapsed ? "mx-auto w-10" : "w-full")} />
      </div>
    );
  }

  const link = (
    <Link
      href="/sites"
      onClick={onNavigate}
      aria-label={t("changeSite", { name: brand.name })}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg border border-nav-border bg-nav-card p-2.5 transition-colors duration-120 hover:bg-nav-hover",
        collapsed && "mx-auto size-11 justify-center border-0 bg-transparent p-0",
      )}
    >
      <SiteFavicon src={faviconFor(brand.domain)} name={brand.name} size={collapsed ? 32 : 34} />
      {!collapsed && (
        <>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-small font-semibold text-white">{brand.name}</span>
            <span dir="ltr" className="truncate text-start text-caption font-normal text-nav-muted">
              {brand.domain}
            </span>
          </span>
          <ArrowLeftRightIcon aria-hidden className="size-4 shrink-0 text-nav-muted group-hover:text-white" />
        </>
      )}
    </Link>
  );

  return (
    <div data-tour="site-card" className={className}>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side={side}>{t("changeSite", { name: brand.name })}</TooltipContent>
        </Tooltip>
      ) : (
        link
      )}
    </div>
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
  const { brandSlug, noSite, requireSite } = useShell();
  const session = useSessionUser();
  const active = activeNavKey(usePathname());
  const items = navGroups.flatMap((g) => g.items).filter((item) => !item.visible || item.visible(session));
  const navRef = React.useRef<HTMLElement>(null);

  // Keep the active item visible when the list scrolls (short screens, upgrade card shown).
  React.useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [active, items.length]);

  return (
    <nav ref={navRef} aria-label={t("label")} data-tour="sidebar-nav" className={className}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.key}>
            <NavLink
              item={item}
              href={navItemHref(item, brandSlug)}
              active={item.key === active}
              collapsed={collapsed}
              onNavigate={onNavigate}
              // Site pages can't open without a site: greyed out, and a click explains what to do.
              onLocked={noSite && !item.href ? requireSite : undefined}
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
  onLocked,
}: {
  item: NavItem;
  href: string;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  /** Set when the page needs a site and none is open: renders a greyed button that calls this. */
  onLocked?: () => void;
}) {
  const t = useTranslations("shell.nav");
  const side = useEndSide();
  const label = t(`items.${item.key}`);
  const Icon = item.icon;

  const content = (
    <>
      <Icon aria-hidden className="size-[18px] shrink-0 stroke-[1.75]" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && item.soon && (
        <span className="rounded-sm bg-nav-hover px-1.5 text-[11px] leading-4 font-semibold text-nav-muted">
          {t("soon")}
        </span>
      )}
    </>
  );
  const classes = cn(
    "flex h-11 w-full items-center gap-3 rounded-md px-3 text-body font-medium whitespace-nowrap text-nav-fg transition-colors duration-120",
    "hover:bg-nav-hover hover:text-white",
    "aria-[current=page]:bg-nav-active aria-[current=page]:font-semibold aria-[current=page]:text-white aria-[current=page]:shadow-[0_4px_12px_-4px_rgb(37_99_235/0.6)]",
    collapsed && "justify-center px-0",
  );

  const link = onLocked ? (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        onLocked();
      }}
      aria-label={collapsed ? label : undefined}
      className={cn(classes, "text-start opacity-45 hover:bg-transparent hover:text-nav-fg")}
    >
      {content}
    </button>
  ) : (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={classes}
    >
      {content}
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
  const tPlan = useTranslations("account.plans");
  const side = useEndSide();
  const { me, workspace } = useShell();
  const session = useSessionUser();
  const plan = getActivePlan(session?.subscriptions);
  const upsell = nextPlan[plan];
  const profileHref = accountHref.settings("profile");

  if (!me || !workspace) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className={cn("h-10", collapsed ? "mx-auto w-10" : "w-full")} />
      </div>
    );
  }

  const telegramOn = Boolean(me.telegram?.connected);
  const userLine = t("userLine", { role: tRole(workspaceRole(workspace)), plan: tPlan(`${plan}.label`) });

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 border-t border-nav-border py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={profileHref} aria-label={t("manageAria", { name: me.name })} className="relative rounded-full">
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
    <div className="flex flex-col gap-3 border-t border-nav-border p-3">
      {/* Upgrade card, kept for later: an Upgrade button in the profile row replaces it for now.
      {session !== undefined && upsell && (
        <section className="flex flex-col gap-3 rounded-lg border border-nav-border bg-nav-card p-4">
          <div className="flex items-center gap-2">
            <StarIcon aria-hidden className="size-4 fill-nav-star text-nav-star" />
            <h2 className="text-h3 text-white">{t("upgradeTitle", { plan: tPlan(`${upsell}.label`) })}</h2>
          </div>
          <p className="text-small text-nav-fg">{t("upgradeBody")}</p>
          <Button asChild variant="agent" size="sm" className="w-full">
            <Link href={accountHref.upgrade()} onClick={onNavigate}>
              {t("viewPlans")}
            </Link>
          </Button>
        </section>
      )} */}

      <div className="flex items-center gap-1.5">
        <Link
          href={profileHref}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-nav-hover"
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
        {session !== undefined && upsell && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="agent" size="sm" className="shrink-0 px-2.5">
                <Link href={accountHref.upgrade()} onClick={onNavigate}>
                  <SparklesIcon />
                  {t("upgradeShort")}
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={side}>{t("upgradeTitle", { plan: tPlan(`${upsell}.label`) })}</TooltipContent>
          </Tooltip>
        )}
      </div>
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
