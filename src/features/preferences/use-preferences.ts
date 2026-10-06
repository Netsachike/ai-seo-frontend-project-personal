"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import type { Me } from "@/lib/api/types";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { updateMe } from "@/lib/mocks/store";
import { meKeys } from "@/lib/api/query-keys";
import { setClientCookie } from "@/lib/cookies";
import type { ThemePreference } from "@/lib/theme";

/**
 * UI language and theme. Both go to a cookie (so the server renders them) and,
 * when signed in, to the profile. A language change refreshes the page in
 * place, so the route and URL filters are kept.
 */
export function usePreferences({ persist = true }: { persist?: boolean } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, resolvedTheme, setTheme: setNextTheme } = useTheme();

  const saveToProfile = (patch: Partial<Pick<Me, "locale" | "theme">>) => {
    if (!persist) return;
    queryClient.setQueryData<Me>(meKeys.all, (me) => (me ? { ...me, ...patch } : me));
    void updateMe(patch).catch(() => undefined);
  };

  return {
    theme: (theme ?? "system") as ThemePreference,
    resolvedTheme: resolvedTheme === "dark" ? "dark" : "light",
    setTheme: (next: ThemePreference) => {
      setNextTheme(next);
      saveToProfile({ theme: next });
    },
    setLocale: (next: Locale) => {
      setClientCookie(LOCALE_COOKIE, next);
      saveToProfile({ locale: next });
      router.refresh();
    },
  };
}
