import type { Locale as DateFnsLocale } from "date-fns";
import { ar, de, enUS, es, fr, ja, ptBR, zhCN } from "date-fns/locale";

const map: Record<string, DateFnsLocale> = { en: enUS, es, fr, de, pt: ptBR, ar, zh: zhCN, ja };

/** date-fns locale for calendars, so month names and week start follow the UI language. */
export function dateLocale(locale: string): DateFnsLocale {
  return map[locale] ?? enUS;
}
