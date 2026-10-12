import type { Site } from "@/types/types";

/** The `/[brand]/…` route segment for a site: its backend id. */
export const siteSlug = (site: Pick<Site, "id">) => String(site.id);

/** Reads a site id back out of the route segment. NaN for anything that is not a positive integer. */
export const siteIdFromSlug = (slug: string) => (/^\d+$/.test(slug) ? Number(slug) : Number.NaN);

export const faviconFor = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

/** Language Rankoya writes in for this site. Separate from the user's UI language. */
export const siteLanguage = (site: Pick<Site, "language">) => site.language ?? "en";

/** ISO 3166-1 alpha-2 country the site targets. */
export const siteMarket = (site: Pick<Site, "location">) => site.location.country ?? "US";

/** "netsach-tech.co" → "Netsach Tech", used to name a site before its crawl. */
export function nameFromDomain(domain: string) {
  return (domain.split(".")[0] ?? domain)
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
