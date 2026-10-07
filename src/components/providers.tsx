"use client";

import * as React from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Direction } from "radix-ui";

import { TIMEZONE_COOKIE, dirFor } from "@/i18n/config";
import { readClientCookie, setClientCookie } from "@/lib/cookies";
import { THEME_COOKIE, type ThemePreference } from "@/lib/theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { BrandGate } from "@/components/providers/brand-gate";
import { BrandProvider } from "@/components/providers/brand-provider";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          const status = (error as { status?: number } | null)?.status;
          if (status && status >= 400 && status < 500) return false;
          return count < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/** Mirrors the theme choice into a cookie so the server renders the right class next time. */
function ThemeCookieSync() {
  const { theme } = useTheme();
  React.useEffect(() => {
    if (theme) setClientCookie(THEME_COOKIE, theme);
  }, [theme]);
  return null;
}

/** Mirrors the browser time zone so server-rendered times and greetings match the user's clock. */
function TimeZoneCookieSync() {
  React.useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && readClientCookie(TIMEZONE_COOKIE) !== zone) setClientCookie(TIMEZONE_COOKIE, zone);
  }, []);
  return null;
}

export function Providers({
  children,
  locale,
  initialTheme,
  vendorHost,
}: {
  children: React.ReactNode;
  locale: string;
  initialTheme: ThemePreference;
  /** False on a White Label tenant domain: the brand is resolved before the app shows. */
  vendorHost: boolean;
}) {
  const queryClient = getQueryClient();
  const dir = dirFor(locale);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={initialTheme}
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_COOKIE}
    >
      <ThemeCookieSync />
      <TimeZoneCookieSync />
      <QueryClientProvider client={queryClient}>
        <BrandProvider>
          <NuqsAdapter>
            <Direction.Provider dir={dir}>
              <TooltipProvider>
                <BrandGate vendorHost={vendorHost}>{children}</BrandGate>
                <Toaster />
              </TooltipProvider>
            </Direction.Provider>
          </NuqsAdapter>
        </BrandProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
