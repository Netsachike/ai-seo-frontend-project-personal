import type { PlanName } from "@/lib/plan-core";

/**
 * Display prices for the upgrade page, in USD. Orbit's pricing isn't set
 * yet, so every price is `null` and the cards say so. Fill these in with the
 * amounts configured in Paddle; checkout always charges the Paddle price.
 *
 * `original` shows a struck-through launch-offer price when it's higher.
 */
export type DisplayPrice = { monthly: number | null; annually: number | null; original?: number | null };

export const PLAN_PRICES: Record<Exclude<PlanName, "free">, DisplayPrice> = {
  professional: { monthly: null, annually: null },
  agency: { monthly: null, annually: null },
  reseller: { monthly: null, annually: null },
};

export type WhiteLabelTier = "whitelabel_starter" | "whitelabel_pro" | "whitelabel_unlimited";

/** One-time White Label licences. Seat counts match the `reseller_seats` add-on. */
export const WHITE_LABEL_TIERS: Record<WhiteLabelTier, { price: number | null; seats: number | null }> = {
  whitelabel_starter: { price: null, seats: 100 },
  whitelabel_pro: { price: null, seats: 300 },
  whitelabel_unlimited: { price: null, seats: null },
};
