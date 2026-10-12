/**
 * Server-side access to the Vercel project that serves White Label domains.
 *
 * Demo mode: when neither the Vercel credentials nor an API base URL are set
 * (local runs and preview deploys), these helpers simulate Vercel so the
 * add → DNS → verify flow can be walked through. A new domain verifies
 * ownership after ~15 s and routing after ~25 s. With an API configured but
 * no Vercel credentials, the routes answer with the real "configuration is
 * missing" error instead.
 */
export const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
export const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
export const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export const isVercelConfigured = Boolean(VERCEL_TOKEN && VERCEL_PROJECT_ID);
export const isVercelDemo = !isVercelConfigured && !process.env.NEXT_PUBLIC_API_BASE_URL;

/** Adds `teamId` when the project belongs to a team. */
export function vercelUrl(path: string) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (VERCEL_TEAM_ID) url.searchParams.set("teamId", VERCEL_TEAM_ID);
  return url.toString();
}

// ── Demo simulation ──────────────────────────────────────────────────────

const VERIFY_AFTER_MS = 15_000;
const ROUTE_AFTER_MS = 25_000;
/** Seeded as live in the demo API (see services/api/demo-adapter.ts). */
const ALWAYS_LIVE = new Set(["seo.adasagency.com"]);
const firstSeen = new Map<string, number>();

function age(domain: string) {
  if (ALWAYS_LIVE.has(domain)) return Infinity;
  if (!firstSeen.has(domain)) firstSeen.set(domain, Date.now());
  return Date.now() - (firstSeen.get(domain) ?? Date.now());
}

const fakeToken = (domain: string) =>
  Array.from(domain)
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
    .toString(16)
    .padStart(8, "0");

export const demoVercel = {
  add(domain: string) {
    firstSeen.set(domain, Date.now());
    return { name: domain, verified: false };
  },
  status(domain: string) {
    const verified = age(domain) >= VERIFY_AFTER_MS;
    return {
      name: domain,
      verified,
      verification: verified
        ? []
        : [{ type: "TXT", domain: `_vercel.${domain}`, value: `vc-domain-verify=${domain},${fakeToken(domain)}` }],
    };
  },
  config(domain: string) {
    return {
      misconfigured: age(domain) < ROUTE_AFTER_MS,
      recommendedCNAME: [{ rank: 1, value: "cname.vercel-dns.com." }],
      recommendedIPv4: [{ rank: 1, value: ["76.76.21.21"] }],
    };
  },
  remove(domain: string) {
    firstSeen.delete(domain);
  },
};
