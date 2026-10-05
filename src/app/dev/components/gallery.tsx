"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { Direction } from "radix-ui";

import { LOCALE_COOKIE, enabledLocales, localeMeta, type Locale } from "@/i18n/config";
import { setClientCookie } from "@/lib/cookies";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AgentSection,
  ButtonsSection,
  ChartsSection,
  DataDisplaySection,
  FormsSection,
  OverlaysSection,
  TableSection,
  TokensSection,
  TypographySection,
} from "./sections";

export function Gallery() {
  const t = useTranslations("dev");
  const router = useRouter();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const [dir, setDir] = React.useState<"ltr" | "rtl">(locale === "ar" ? "rtl" : "ltr");
  const mounted = useMounted();

  const switchLocale = (next: string) => {
    setClientCookie(LOCALE_COOKIE, next);
    setDir(next === "ar" ? "rtl" : "ltr");
    router.refresh();
  };

  const nav = [
    ["tokens", t("nav.tokens")],
    ["type", t("nav.type")],
    ["buttons", t("nav.buttons")],
    ["forms", t("nav.forms")],
    ["display", t("nav.display")],
    ["charts", t("nav.charts")],
    ["agent", t("nav.agent")],
    ["table", t("nav.table")],
    ["overlays", t("nav.overlays")],
  ] as const;

  return (
    <div className="min-h-dvh bg-bg">
      <header className="z-30 border-b border-border bg-surface/95 backdrop-blur-sm md:sticky md:top-0">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-small text-fg-3">{t("title")}</span>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-3">
            <Control label={t("controls.theme")}>
              <Tabs value={mounted ? theme : "system"} onValueChange={setTheme}>
                <TabsList variant="segmented" aria-label={t("controls.theme")}>
                  <TabsTrigger value="light">{t("controls.light")}</TabsTrigger>
                  <TabsTrigger value="dark">{t("controls.dark")}</TabsTrigger>
                  <TabsTrigger value="system">{t("controls.system")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </Control>
            <Control label={t("controls.direction")}>
              <Tabs value={dir} onValueChange={(v) => setDir(v as "ltr" | "rtl")}>
                <TabsList variant="segmented" aria-label={t("controls.direction")}>
                  <TabsTrigger value="ltr">{t("controls.ltr")}</TabsTrigger>
                  <TabsTrigger value="rtl">{t("controls.rtl")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </Control>
            <Control label={t("controls.language")}>
              <Tabs value={locale} onValueChange={switchLocale}>
                <TabsList variant="segmented" aria-label={t("controls.language")}>
                  {enabledLocales.map((l: Locale) => (
                    <TabsTrigger key={l} value={l} lang={l}>
                      {localeMeta[l].native}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </Control>
          </div>
        </div>
        <nav aria-label={t("nav.label")} className="mx-auto max-w-[1440px] overflow-x-auto px-4 md:px-8">
          <ul className="flex gap-1 pb-2">
            {nav.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex h-8 items-center rounded-md px-2.5 text-small whitespace-nowrap text-fg-2 hover:bg-surface-2 hover:text-fg"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Direction.Provider dir={dir}>
        <main dir={dir} className="mx-auto flex max-w-[1440px] flex-col gap-16 px-4 py-10 md:px-8">
          <div className="flex max-w-[64ch] flex-col gap-2">
            <h1 className="text-h1">{t("heading")}</h1>
            <p className="text-body text-fg-2">{t("intro")}</p>
          </div>
          <TokensSection />
          <TypographySection />
          <ButtonsSection />
          <FormsSection />
          <DataDisplaySection />
          <ChartsSection />
          <AgentSection />
          <TableSection />
          <OverlaysSection />
        </main>
      </Direction.Provider>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-2")}>
      <span className="text-caption text-fg-3">{label}</span>
      {children}
    </div>
  );
}
