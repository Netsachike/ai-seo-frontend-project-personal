export type BillingPeriod = "monthly" | "annually" | "one-time";

/**
 * Plan keys (per billing period) → Paddle price IDs, supplied via env vars
 * from the Paddle dashboard. `reseller` is the plan users see as Enterprise.
 */
const PRICE_IDS: Record<string, Record<string, string>> = {
  free: { monthly: "", annually: "" },
  professional: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PROFESSIONAL_PLAN_MONTHLY ?? "",
    annually: process.env.NEXT_PUBLIC_PADDLE_PROFESSIONAL_PLAN_ANNUALLY ?? "",
  },
  agency: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_AGENCY_PLAN_MONTHLY ?? "",
    annually: process.env.NEXT_PUBLIC_PADDLE_AGENCY_PLAN_ANNUALLY ?? "",
  },
  reseller: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_RESELLER_PLAN_MONTHLY ?? "",
    annually: process.env.NEXT_PUBLIC_PADDLE_RESELLER_PLAN_ANNUALLY ?? "",
  },
  whitelabel_starter: {
    "one-time": process.env.NEXT_PUBLIC_PADDLE_WHITELABEL_STARTER ?? "",
  },
  whitelabel_pro: {
    "one-time": process.env.NEXT_PUBLIC_PADDLE_WHITELABEL_PRO ?? "",
  },
  whitelabel_unlimited: {
    "one-time": process.env.NEXT_PUBLIC_PADDLE_WHITELABEL_UNLIMITED ?? "",
  },
};

/** One-time (lifetime) add-on that removes "Powered by Rankoya". */
export const REMOVE_BRANDING_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_REMOVE_BRANDING_LIFETIME ?? "";

export const PADDLE_CONFIG = { prices: PRICE_IDS };

/** Resolves the Paddle price ID for a paid plan (free has no checkout). */
export function getPlanPriceId(plan: string, period: string = "monthly"): string | undefined {
  if (plan === "free") {
    return undefined;
  }
  return PRICE_IDS[plan]?.[period] || undefined;
}
