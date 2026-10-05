import type { Formats } from "next-intl";

/**
 * Shared named formats. Latin digits are used in every locale so figures
 * stay in Geist Mono with tabular alignment; separators and grouping still
 * follow the locale.
 */
export const formats = {
  number: {
    integer: { maximumFractionDigits: 0, numberingSystem: "latn" },
    decimal: { minimumFractionDigits: 1, maximumFractionDigits: 1, numberingSystem: "latn" },
    percent: { style: "percent", maximumFractionDigits: 0, numberingSystem: "latn" },
    percentPrecise: { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, numberingSystem: "latn" },
    compact: { notation: "compact", maximumFractionDigits: 1, numberingSystem: "latn" },
    currency: { style: "currency", currency: "USD", numberingSystem: "latn" },
  },
  dateTime: {
    short: { month: "short", day: "numeric" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    time: { hour: "2-digit", minute: "2-digit", numberingSystem: "latn" },
    weekday: { weekday: "short" },
    monthYear: { month: "long", year: "numeric" },
  },
} satisfies Formats;
