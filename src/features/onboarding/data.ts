/**
 * UI-stage suggestions for onboarding. This is brand data (written in the
 * brand's content language), not interface copy, so it is not translated.
 */

export const onboardingSteps = ["brand", "competitors", "keywords", "connect", "scan"] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];
export const isOnboardingStep = (value: string): value is OnboardingStep =>
  (onboardingSteps as readonly string[]).includes(value);

export const industries = ["foodDrink", "retail", "saas", "health", "travel", "finance", "education", "other"] as const;
export type Industry = (typeof industries)[number];

export const markets = ["US", "GB", "CA", "AU", "DE", "FR", "ES", "AE", "SA", "JP"] as const;
export const contentLanguages = ["en", "es", "fr", "de", "pt", "ar", "zh", "ja"] as const;

export const MAX_COMPETITORS = 5;

export type CompetitorSuggestion = { id: string; name: string; domain: string; sharedKeywords: number | null };

export const competitorSuggestions: CompetitorSuggestion[] = [
  { id: "c1", name: "Bluebird Coffee", domain: "bluebirdcoffee.example", sharedKeywords: 42 },
  { id: "c2", name: "Halfmoon Roastery", domain: "halfmoonroastery.example", sharedKeywords: 31 },
  { id: "c3", name: "Ember & Oak", domain: "emberandoak.example", sharedKeywords: 27 },
  { id: "c4", name: "Driftwood Beans", domain: "driftwoodbeans.example", sharedKeywords: 18 },
  { id: "c5", name: "Copper Kettle Co.", domain: "copperkettle.example", sharedKeywords: 12 },
  { id: "c6", name: "Morning Ritual", domain: "morningritual.example", sharedKeywords: 9 },
];

export type KeywordSuggestion = { id: string; text: string; volume: number; difficulty: number };
export type QuestionSuggestion = { id: string; text: string };

export const keywordSuggestions: KeywordSuggestion[] = [
  { id: "k1", text: "coffee subscription", volume: 12100, difficulty: 64 },
  { id: "k2", text: "best coffee subscription", volume: 8100, difficulty: 71 },
  { id: "k3", text: "single origin coffee", volume: 6600, difficulty: 48 },
  { id: "k4", text: "fresh roasted coffee beans", volume: 4400, difficulty: 41 },
  { id: "k5", text: "light roast coffee beans", volume: 3600, difficulty: 35 },
  { id: "k6", text: "coffee of the month club", volume: 2900, difficulty: 37 },
  { id: "k7", text: "ethiopian yirgacheffe coffee", volume: 2400, difficulty: 29 },
  { id: "k8", text: "coffee gift subscription", volume: 1900, difficulty: 30 },
  { id: "k9", text: "whole bean coffee subscription", volume: 1600, difficulty: 33 },
  { id: "k10", text: "organic coffee subscription", volume: 1300, difficulty: 44 },
];

export const questionSuggestions: QuestionSuggestion[] = [
  { id: "q1", text: "best coffee subscription in the US" },
  { id: "q2", text: "which coffee subscription has the freshest beans" },
  { id: "q3", text: "is a coffee subscription worth it" },
  { id: "q4", text: "what is single-origin coffee" },
  { id: "q5", text: "how fresh should coffee beans be" },
  { id: "q6", text: "best coffee gift for coffee lovers" },
  { id: "q7", text: "how to choose coffee beans for pour-over" },
  { id: "q8", text: "most ethical coffee brands" },
  { id: "q9", text: "small-batch coffee roasters that ship nationwide" },
  { id: "q10", text: "light vs dark roast: which has more caffeine" },
];

/** What the fake crawl "learns". Northwind gets its real profile; anything else gets a guess from the domain. */
export function guessProfile(domain: string) {
  if (domain.includes("northwind")) {
    return {
      name: "Northwind Roasters",
      industry: "foodDrink" as Industry,
      market: "US",
      contentLanguage: "en",
      description: "Small-batch, single-origin coffee roasted to order and sold by subscription.",
      pages: 148,
    };
  }
  const label = domain.split(".")[0] ?? domain;
  const name = label
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { name, industry: "other" as Industry, market: "US", contentLanguage: "en", description: "", pages: 37 };
}

export const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;
