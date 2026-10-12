import type { AllUserSubscriptionsNew, SubscriptionDataNew } from "@/types/types";

/**
 * Add-on keys treated as real, user-facing add-ons. The subscriptions payload
 * still carries legacy package flags that are not offered as add-ons; only
 * `remove_branding` and `reseller_seats` are. Everything else is filtered out
 * of add-on displays.
 */
export const VALID_ADDON_KEYS = ["remove_branding", "reseller_seats"] as const;
export type ValidAddonKey = (typeof VALID_ADDON_KEYS)[number];

export function isValidAddon(key: string): key is ValidAddonKey {
  return (VALID_ADDON_KEYS as readonly string[]).includes(key);
}

/** Whether the account owns the active `remove_branding` add-on (hides "Powered by Rankoya"). */
export function hasRemoveBranding(subscriptions: AllUserSubscriptionsNew | null | undefined): boolean {
  const addons = subscriptions?.addons;
  if (!addons || Array.isArray(addons)) return false;
  const removeBranding = addons.remove_branding;
  return Boolean(removeBranding && typeof removeBranding === "object" && removeBranding.status);
}

/**
 * Whether the account owns the active `reseller_seats` add-on, sold on the
 * front end as "White Label", which unlocks custom domains and branding.
 */
export function hasWhiteLabel(subscriptions: AllUserSubscriptionsNew | null | undefined): boolean {
  const addons = subscriptions?.addons;
  if (!addons || Array.isArray(addons)) return false;
  const resellerSeats = addons.reseller_seats;
  return Boolean(resellerSeats && typeof resellerSeats === "object" && resellerSeats.status);
}

/**
 * The next billing cycle for a subscription, derived from its start date rolled
 * forward by its billing interval until the date lands in the future. Lifetime
 * plans have no renewal, so they return null.
 *
 * Note: an approximation. The authoritative renewal date should come from
 * Paddle (`next_billed_at`) when available.
 */
export function getNextBillingDate(subscription: SubscriptionDataNew | undefined | null): Date | null {
  if (!subscription?.start_date || subscription.type === "lifetime") {
    return null;
  }
  const start = new Date(subscription.start_date);
  if (Number.isNaN(start.getTime())) return null;

  const now = new Date();
  const next = new Date(start);
  const stepYearly = subscription.type === "yearly";
  let guard = 0;
  while (next <= now && guard < 1000) {
    if (stepYearly) next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    guard += 1;
  }
  return next;
}
