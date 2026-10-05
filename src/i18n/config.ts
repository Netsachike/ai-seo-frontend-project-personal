export const locales = ["en", "es", "fr", "de", "pt", "ar", "zh", "ja"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * Locales with a message file today. `en` is the source of truth; the rest
 * start as machine-drafted copies (`"_status": "draft"`). Phase 7 adds the
 * remaining files and widens this list.
 */
export const enabledLocales: readonly Locale[] = ["en", "ar"];

export const rtlLocales: readonly Locale[] = ["ar"];

export const LOCALE_COOKIE = "orbit_locale";
export const TIMEZONE_COOKIE = "orbit_tz";
/** Set by proxy.ts from Accept-Language when there is no cookie. */
export const LOCALE_HEADER = "x-orbit-locale";

export const localeMeta: Record<Locale, { native: string; english: string; short: string }> = {
  en: { native: "English", english: "English", short: "EN" },
  es: { native: "Español", english: "Spanish", short: "ES" },
  fr: { native: "Français", english: "French", short: "FR" },
  de: { native: "Deutsch", english: "German", short: "DE" },
  pt: { native: "Português", english: "Portuguese", short: "PT" },
  ar: { native: "العربية", english: "Arabic", short: "AR" },
  zh: { native: "中文", english: "Chinese", short: "ZH" },
  ja: { native: "日本語", english: "Japanese", short: "JA" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function isEnabledLocale(value: unknown): value is Locale {
  return isLocale(value) && enabledLocales.includes(value);
}

export function isRtl(locale: string): boolean {
  return (rtlLocales as readonly string[]).includes(locale);
}

export function dirFor(locale: string): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

/** Best enabled match for an Accept-Language header, honoring q-values. */
export function matchAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isEnabledLocale(base)) return base;
  }
  return undefined;
}

/** cookie → profile (mirrored into the cookie on sign-in and on PATCH /me) → Accept-Language → en */
export function resolveLocale(input: {
  cookie?: string | null;
  header?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isEnabledLocale(input.cookie)) return input.cookie;
  if (isEnabledLocale(input.header)) return input.header;
  return matchAcceptLanguage(input.acceptLanguage) ?? defaultLocale;
}
