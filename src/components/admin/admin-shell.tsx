"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, BarChart3Icon, MailIcon, MenuIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

type AdminNavItem = { key: "users" | "statistics" | "marketing"; href: string; icon: LucideIcon };

const adminNavItems: AdminNavItem[] = [
  { key: "users", href: "/admin/user-management", icon: UsersIcon },
  { key: "statistics", href: "/admin/statistics", icon: BarChart3Icon },
  { key: "marketing", href: "/admin/marketing", icon: MailIcon },
];

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1.5 px-5 pt-5 pb-4">
        <Logo tone="onDark" height={26} />
        <span className="text-caption font-normal text-nav-muted">{t("subtitle")}</span>
      </div>
      <nav aria-label={t("label")} className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {adminNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-body font-medium text-nav-fg transition-colors duration-120",
                    "hover:bg-nav-hover hover:text-white",
                    "aria-[current=page]:bg-nav-active aria-[current=page]:font-semibold aria-[current=page]:text-white",
                  )}
                >
                  <Icon aria-hidden className="size-[18px] shrink-0 stroke-[1.75]" />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-nav-border p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex h-11 items-center gap-3 rounded-md px-3 text-body text-nav-fg hover:bg-nav-hover hover:text-white"
        >
          <ArrowLeftIcon aria-hidden className="size-[18px] rtl:-scale-x-100" />
          {t("backToApp")}
        </Link>
      </div>
    </div>
  );
}

/** Admin console frame: navy sidebar (a sheet on mobile) and a slim top bar. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.nav");
  const [mobileNav, setMobileNav] = React.useState(false);

  return (
    <div className="flex min-h-dvh">
      <aside className="dark sticky top-0 hidden h-dvh w-[248px] shrink-0 border-e border-nav-border bg-nav text-nav-fg lg:block">
        <AdminNav />
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="start" className="dark w-[280px] gap-0 border-nav-border bg-nav p-0 text-nav-fg">
          <SheetTitle className="sr-only">{t("label")}</SheetTitle>
          <SheetDescription className="sr-only">{t("subtitle")}</SheetDescription>
          <AdminNav onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label={t("open")}
              onClick={() => setMobileNav(true)}
            >
              <MenuIcon />
            </Button>
            <p className="text-small font-medium text-fg-2">{t("title")}</p>
          </div>
          <ThemeToggle />
        </header>
        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
