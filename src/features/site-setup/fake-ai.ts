import type { Site } from "@/types/types";
import type { TopicSuggestion } from "./store";
import { siteLanguage, siteMarket } from "@/features/sites/site-utils";

/**
 * UI-stage stand-in for the backend's site analysis. The real endpoint crawls
 * the homepage plus a few linked pages, then streams markdown from the model;
 * this yields canned markdown in uneven bursts with the same shape, so the
 * loaders, live writing and confirm flow behave as they will for real.
 *
 * Output contract (same as the prompt's): markdown only, each heading a plain
 * line of its own, 3–6 one- or two-sentence bullets under it.
 */

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/** Yields `text` in 4–40 character bursts 20–200 ms apart, after a "crawl" pause. */
export async function* fakeTextStream(
  text: string,
  { signal, crawlMs = 1400 }: { signal?: AbortSignal; crawlMs?: number },
) {
  await sleep(crawlMs, signal);
  for (let i = 0; i < text.length;) {
    const size = 4 + Math.floor(Math.random() * 36);
    yield text.slice(i, i + size);
    i += size;
    await sleep(20 + Math.random() * 180, signal);
  }
}

export type ProfileSection = "description" | "audience";

type SiteProfile = Record<ProfileSection, string> & { topics: TopicSuggestion[] };

const northwind: SiteProfile = {
  description: `Core Business

- Northwind Roasters is a small-batch coffee roaster that sells single-origin beans online, mostly by subscription.
- It roasts every order itself and states that beans ship within 48 hours of roasting.
- Customers choose a roast level, grind and delivery frequency, from weekly to monthly.

Key Features

- Coffee subscriptions with flexible schedules that can be paused or skipped from the account page.
- Single-origin beans with the farm, region, altitude and process listed for each coffee.
- Gift subscriptions of 3, 6 or 12 months.
- Brewing guides for pour-over, espresso, French press and cold brew.
- The site has pages for Shop, Subscriptions, Our Farms, Brew Guides, About and Contact.

Unique Value Proposition

- It roasts to order rather than holding stock, so it presents freshness as its main difference from larger subscription boxes.
- It names the farms it buys from and states that it pays above Fair Trade minimums.
- It focuses on light and medium roasts for filter brewing.`,
  audience: `Primary Audience

- Home coffee drinkers in the United States who brew filter or espresso and want fresher beans than supermarket coffee.
- People buying a coffee gift for someone who already enjoys specialty coffee.
- Small offices and studios that want a regular delivery of whole beans.

Key Characteristics

- They compare subscriptions on freshness, price per bag and how easy it is to skip or pause a delivery.
- Many are learning to brew better at home and search for how-to guides and equipment advice.
- They care where coffee comes from and respond to named farms and clear sourcing.

Search Behaviour

- They search for comparisons such as "best coffee subscription" and "freshest coffee beans online".
- They ask practical questions about roast dates, grind size and brew ratios.`,
  topics: [
    { id: "t1", label: "Coffee Subscriptions", recommended: true, volume: 40500 },
    { id: "t2", label: "Single Origin Coffee", recommended: true, volume: 18100 },
    { id: "t3", label: "Pour Over Brewing", recommended: true, volume: 14800 },
    { id: "t4", label: "Coffee Gifts", recommended: true, volume: 22200 },
    { id: "t5", label: "Coffee Bean Freshness", recommended: true, volume: 6600 },
    { id: "t6", label: "Espresso at Home", recommended: false, volume: 27100 },
    { id: "t7", label: "Cold Brew Coffee", recommended: false, volume: 33100 },
    { id: "t8", label: "Light Roast Coffee", recommended: false, volume: 9900 },
    { id: "t9", label: "Ethical Coffee Sourcing", recommended: false, volume: 2900 },
    { id: "t10", label: "Coffee Grinders", recommended: false, volume: 12100 },
  ],
};

function genericProfile(site: Pick<Site, "name" | "domain">): SiteProfile {
  const { name, domain } = site;
  return {
    description: `Core Business

- ${name} runs ${domain}, a website that presents its products and services and how to buy or get in touch.
- The homepage describes what it offers in short sections with links to more detailed pages.
- It states that it works with customers online, and its contact page lists email and a contact form.

Key Features

- Service and product pages that describe each offer, who it is for and what is included.
- An About page with the company's background and the people behind it.
- A contact or enquiry form for quotes and questions.
- The site has pages for Home, About, Services, Contact and a blog or news section.

Unique Value Proposition

- It presents itself as a specialist in its field rather than a general provider.
- It emphasises responsive support and clear communication with customers.
- It states that it delivers consistent quality across projects.`,
    audience: `Primary Audience

- Small and mid-sized business owners looking for the services ${name} offers.
- Managers and decision-makers comparing providers before getting in touch.
- Returning customers checking for updates, new offers or support.

Key Characteristics

- They want clear answers on price, scope and timelines before they enquire.
- Many compare several providers and look for examples of past work and reviews.
- They prefer plain explanations to industry jargon.

Search Behaviour

- They search for the service plus their location or industry, and for comparisons between providers.
- They ask how-to and cost questions before they are ready to buy.`,
    topics: [
      { id: "g1", label: `${name} Services`, recommended: true, volume: 2400 },
      { id: "g2", label: "Pricing and Costs", recommended: true, volume: 8100 },
      { id: "g3", label: "How-to Guides", recommended: true, volume: 12100 },
      { id: "g4", label: "Provider Comparisons", recommended: true, volume: 5400 },
      { id: "g5", label: "Industry Best Practices", recommended: true, volume: 3600 },
      { id: "g6", label: "Case Studies", recommended: false, volume: 1900 },
      { id: "g7", label: "Beginner Guides", recommended: false, volume: 6600 },
      { id: "g8", label: "Tools and Resources", recommended: false, volume: 4400 },
      { id: "g9", label: "Frequently Asked Questions", recommended: false, volume: 2900 },
      { id: "g10", label: "Industry News and Trends", recommended: false, volume: 1600 },
    ],
  };
}

const profileFor = (site: Pick<Site, "name" | "domain">) =>
  site.domain.includes("northwind") ? northwind : genericProfile(site);

export function streamProfileSection(
  site: Pick<Site, "name" | "domain">,
  section: ProfileSection,
  signal?: AbortSignal,
) {
  // The audience pass reads the confirmed description first, so it starts a little faster.
  return fakeTextStream(profileFor(site)[section], { signal, crawlMs: section === "description" ? 1800 : 1100 });
}

/** Ten suggestions, five marked as recommended. */
export async function generateTopics(site: Pick<Site, "name" | "domain">, signal?: AbortSignal) {
  await sleep(2200 + Math.random() * 800, signal);
  return profileFor(site).topics;
}

/** Name the crawl reads from <title> or og:site_name. */
export function crawledName(site: Pick<Site, "name" | "domain">) {
  return site.domain.includes("northwind") ? "Northwind Roasters" : site.name;
}

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

/** Defaults the crawl would read from <html lang>, the TLD and the content language. */
export function detectLocale(site: Pick<Site, "domain" | "location" | "language">) {
  const country = COUNTRY_BY_TLD[site.domain.split(".").pop() ?? ""] ?? siteMarket(site);
  return { country, language: LANGUAGE_BY_COUNTRY[country] ?? siteLanguage(site) };
}
