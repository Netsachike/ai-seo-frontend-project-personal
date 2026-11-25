import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { dirFor } from "@/i18n/config";
import { deriveTenantTokens, isDefaultAppHost } from "@/config/brand";
import { requestHost, resolveTenantBrand } from "@/lib/brand-server";
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

/** Rankoya's own icons, in /public so a tenant host can swap them for its own. */
const VENDOR_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/icon.png", type: "image/png", sizes: "512x512" },
  ],
  apple: "/apple-icon.png",
};

export async function generateMetadata(): Promise<Metadata> {
  const [t, brand] = await Promise.all([getTranslations("meta"), requestHost().then(resolveTenantBrand)]);
  if (!brand) {
    return {
      title: { default: t("title"), template: t("titleTemplate") },
      description: t("description"),
      icons: VENDOR_ICONS,
    };
  }

  // A White Label host: the reseller's name and icon from the very first HTML.
  const name = brand.brand_name;
  const icon = brand.favicon_url || brand.logo_icon_url;
  return {
    title: { default: name, template: `%s · ${name}` },
    description: t("description").replace(/Rankoya/g, name),
    icons: icon ? { icon, apple: brand.logo_icon_url || icon } : VENDOR_ICONS,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, cookieStore, host] = await Promise.all([getLocale(), cookies(), requestHost()]);
  const vendorHost = isDefaultAppHost(host);
  // Shares generateMetadata's request (memoised), so this costs no second call.
  const tenantBrand = vendorHost ? null : await resolveTenantBrand(host);
  const script = localeFont(locale);
  // The tenant palette goes on <html> from the server, so nothing paints in Rankoya blue first.
  const rootStyle = {
    ...(script ? { "--font-locale": script.family } : {}),
    ...(tenantBrand ? deriveTenantTokens(tenantBrand) : {}),
  } as React.CSSProperties;
  const savedTheme = cookieStore.get(THEME_COOKIE)?.value;
  // Light is the default for everyone; an explicit dark choice is rendered on the server.
  const serverThemeClass = savedTheme === "dark" ? "dark" : undefined;

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      suppressHydrationWarning
      className={cn(geistSans.variable, geistMono.variable, script?.className, serverThemeClass)}
      style={Object.keys(rootStyle).length > 0 ? rootStyle : undefined}
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
            host={host}
            initialBrand={tenantBrand}
          >
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
