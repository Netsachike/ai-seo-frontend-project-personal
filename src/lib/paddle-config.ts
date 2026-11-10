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

/**
 * Funnel offers and credit packs (docs/Rankoya_Funnel_Credit_Specification.pdf),
 * all one-time Paddle prices. Keys are the product names the backend should
 * store on the subscription / add-on rows and map to credit grants.
 * Env reads stay literal so Next inlines them.
 */
export const FUNNEL_PRICE_IDS = {
  core: process.env.NEXT_PUBLIC_PADDLE_CORE ?? "",
  commercial: process.env.NEXT_PUBLIC_PADDLE_COMMERCIAL ?? "",
  autopilot: process.env.NEXT_PUBLIC_PADDLE_AUTOPILOT ?? "",
  whitelabel: process.env.NEXT_PUBLIC_PADDLE_WHITELABEL ?? "",
  bundle: process.env.NEXT_PUBLIC_PADDLE_BUNDLE ?? "",
  mega_bundle: process.env.NEXT_PUBLIC_PADDLE_MEGA_BUNDLE ?? "",
  credit_pack_s: process.env.NEXT_PUBLIC_PADDLE_CREDIT_PACK_S ?? "",
  credit_pack_m: process.env.NEXT_PUBLIC_PADDLE_CREDIT_PACK_M ?? "",
  credit_pack_l: process.env.NEXT_PUBLIC_PADDLE_CREDIT_PACK_L ?? "",
  credit_pack_xl: process.env.NEXT_PUBLIC_PADDLE_CREDIT_PACK_XL ?? "",
  credit_pack_in_app: process.env.NEXT_PUBLIC_PADDLE_CREDIT_PACK_IN_APP ?? "",
} as const;

export type FunnelProduct = keyof typeof FUNNEL_PRICE_IDS;

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
