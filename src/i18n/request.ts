import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

import en from "@/messages/en.json";
import { LOCALE_COOKIE, LOCALE_HEADER, TIMEZONE_COOKIE, resolveLocale, type Locale } from "./config";
import { formats } from "./formats";

type Messages = AbstractIntlMessages;

function isObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Missing keys fall back to `en`; in development they are logged once per key. */
function withFallback(base: Messages, override: Messages, locale: Locale, path = ""): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(base)) {
    const next = override[key];
    const keyPath = path ? `${path}.${key}` : key;
    if (isObject(value)) {
      out[key] = withFallback(value, isObject(next) ? next : {}, locale, keyPath);
    } else if (typeof next === "string") {
      out[key] = next;
    } else if (process.env.NODE_ENV === "development") {
      warnOnce(`[i18n] ${locale} is missing "${keyPath}", using en`);
    }
  }
  return out;
}

const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

const loaders: Partial<Record<Locale, () => Promise<{ default: Messages }>>> = {
  ar: () => import("@/messages/ar.json"),
};

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    header: headerStore.get(LOCALE_HEADER),
    acceptLanguage: headerStore.get("accept-language"),
  });

  const load = loaders[locale];
  const messages = load ? withFallback(en, (await load()).default, locale) : en;

  return {
    locale,
    messages,
    formats,
    timeZone: cookieStore.get(TIMEZONE_COOKIE)?.value || "UTC",
    onError(error) {
      if (process.env.NODE_ENV === "development") console.warn(error.message);
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
