import type { Decimal } from "@/types/types";

/** Path under `/sites/{site}`. Every site-scoped endpoint goes through this. */
export const sitePath = (siteId: number | string, path = "") => `/sites/${siteId}${path ? `/${path}` : ""}`;

/**
 * Laravel serialises `decimal:N` columns as strings ("72.50") and SQL
 * aggregates as strings or numbers depending on the driver. Returns null for
 * missing or unparsable values.
 */
export function toNumber(value: Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}
