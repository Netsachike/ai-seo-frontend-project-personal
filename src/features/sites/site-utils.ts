import type { Site } from "@/types/types";

/** The `/[brand]/…` route segment for a site: its backend id. */
export const siteSlug = (site: Pick<Site, "id">) => String(site.id);

/** Reads a site id back out of the route segment. NaN for anything that is not a positive integer. */
export const siteIdFromSlug = (slug: string) => (/^\d+$/.test(slug) ? Number(slug) : Number.NaN);

export const faviconFor = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

/** Language Rankoya writes in for this site. Separate from the user's UI language. */
export const siteLanguage = (site: Pick<Site, "language">) => site.language ?? "en";

/** Where Intl's English name differs from the one the backend's research data uses. */
const COUNTRY_NAME_OVERRIDES: Record<string, string> = { HK: "Hong Kong", MO: "Macau" };

/** "US" → "United States": the backend stores a site's country as its English name. */
export function countryName(code: string) {
  if (COUNTRY_NAME_OVERRIDES[code]) return COUNTRY_NAME_OVERRIDES[code];
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

let codesByName: Map<string, string> | undefined;

/**
 * "United States" (or an older site's "US") → "US". Undefined for anything
 * unrecognised. Built once from every two-letter code Intl can name.
 */
export function countryCode(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  if (!codesByName) {
    codesByName = new Map();
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const a of letters) {
      for (const b of letters) {
        const code = a + b;
        const name = countryName(code);
        // Current codes only, so "United Kingdom" is GB (not UK) and "Germany" is DE (not DD).
        if (name !== code && Intl.getCanonicalLocales(`und-${code}`)[0] === `und-${code}`) {
          codesByName.set(name.toLowerCase(), code);
        }
      }
    }
  }
  return codesByName.get(raw.toLowerCase());
}

/** ISO 3166-1 alpha-2 country the site targets. */
export const siteMarket = (site: Pick<Site, "location">) => countryCode(site.location.country) ?? "US";

/** "netsach-tech.co" → "Netsach Tech", used to name a site before its crawl. */
export function nameFromDomain(domain: string) {
  return (domain.split(".")[0] ?? domain)
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
