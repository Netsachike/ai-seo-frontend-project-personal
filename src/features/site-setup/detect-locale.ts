import type { Site } from "@/types/types";
import { siteLanguage, siteMarket } from "@/features/sites/site-utils";

const COUNTRY_BY_TLD: Record<string, string> = {
  uk: "GB",
  de: "DE",
  fr: "FR",
  es: "ES",
  it: "IT",
  nl: "NL",
  ae: "AE",
  sa: "SA",
  jp: "JP",
  ng: "NG",
  ca: "CA",
  au: "AU",
  in: "IN",
  za: "ZA",
  ie: "IE",
  br: "BR",
  mx: "MX",
};
const LANGUAGE_BY_COUNTRY: Record<string, string> = {
  DE: "de",
  FR: "fr",
  ES: "es",
  IT: "it",
  NL: "nl",
  AE: "ar",
  SA: "ar",
  JP: "ja",
  BR: "pt",
  MX: "es",
};

/** Country and language defaults for the details step: the domain's TLD first, then the site's settings. */
export function detectLocale(site: Pick<Site, "domain" | "location" | "language">) {
  const country = COUNTRY_BY_TLD[site.domain.split(".").pop() ?? ""] ?? siteMarket(site);
  return { country, language: LANGUAGE_BY_COUNTRY[country] ?? siteLanguage(site) };
}
