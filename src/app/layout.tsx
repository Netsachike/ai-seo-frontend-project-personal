import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { dirFor } from "@/i18n/config";
import { isDefaultAppHost } from "@/config/brand";
import { DEFAULT_THEME, THEME_COOKIE, isThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { GoogleTranslateHost } from "@/components/layout/google-translate-host";
import { geistMono, geistSans, localeFont } from "./fonts";
import "./globals.css";

/**
 * Google Translate swaps text nodes React still holds; without this, React's
 * next removeChild/insertBefore throws and the page goes blank.
 */
const TRANSLATE_POLYFILL = `
  if (typeof Node === 'function' && Node.prototype) {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function (child) {
      if (child.parentNode !== this) return child;
      return originalRemoveChild.apply(this, arguments);
    };
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode, referenceNode) {
      if (referenceNode && referenceNode.parentNode !== this) return newNode;
      return originalInsertBefore.apply(this, arguments);
    };
  }
`;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, cookieStore, headerStore] = await Promise.all([getLocale(), cookies(), headers()]);
  const vendorHost = isDefaultAppHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host"));
  const script = localeFont(locale);
  const savedTheme = cookieStore.get(THEME_COOKIE)?.value;
  // Light is the default for everyone; an explicit dark choice is rendered on the server.
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
        {/*
          Google Translate swaps text nodes React still holds; without this,
          React's next removeChild/insertBefore throws and the page goes blank.
        */}
        <Script id="google-translate-polyfill" strategy="beforeInteractive">
          {TRANSLATE_POLYFILL}
        </Script>
        <GoogleTranslateHost />
        <NextIntlClientProvider>
          <Providers
            locale={locale}
            initialTheme={isThemePreference(savedTheme) ? savedTheme : DEFAULT_THEME}
            vendorHost={vendorHost}
          >
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
