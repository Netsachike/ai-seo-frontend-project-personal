import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { dirFor } from "@/i18n/config";
import { THEME_COOKIE, isThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { geistMono, geistSans, localeFont } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d11" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, cookieStore] = await Promise.all([getLocale(), cookies()]);
  const script = localeFont(locale);
  const savedTheme = cookieStore.get(THEME_COOKIE)?.value;
  // Explicit light/dark is rendered on the server; "system" is resolved by next-themes before paint.
  const serverThemeClass = savedTheme === "dark" ? "dark" : undefined;

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      suppressHydrationWarning
      className={cn(geistSans.variable, geistMono.variable, script?.className, serverThemeClass)}
      style={script ? ({ "--font-locale": script.family } as React.CSSProperties) : undefined}
    >
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <Providers locale={locale} initialTheme={isThemePreference(savedTheme) ? savedTheme : "system"}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
