/**
 * In-memory UI mock data with the operations screens need. Everything runs in
 * the browser with a short delay, so loading states are real. State resets on
 * reload. Replace these functions with real API calls when the backend lands;
 * the React Query keys that wrap them can stay the same.
 */
import type {
  AgentMessage,
  Approval,
  Brand,
  BrandSummary,
  Me,
  Notification,
  Range,
  SiteListItem,
  Usage,
  Workspace,
} from "@/lib/api/types";
import {
  agentThread,
  brandSummary,
  brandsByWorkspace,
  me as meFixture,
  notifications as notificationFixtures,
  usageByWorkspace,
  workspaces as workspaceFixtures,
} from "./fixtures";

export class MockError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
    this.name = "MockError";
  }
}

const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const clone = <T>(value: T): T => structuredClone(value);

const state = {
  me: clone(meFixture),
  workspaces: clone(workspaceFixtures),
  brands: clone(brandsByWorkspace),
  notifications: clone(notificationFixtures),
  thread: clone(agentThread),
};

// ── Sites added in this browser ──────────────────────────────────────────
// Unlike the rest of the mock data, sites created through site setup are kept
// in localStorage, so a refresh halfway through setup resumes where it was.

type StoredSite = { workspaceId: string; brand: Brand };
const SITES_STORAGE_KEY = "orbit:mock-sites";

function readStoredSites(): StoredSite[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(SITES_STORAGE_KEY) ?? "[]") as StoredSite[];
  } catch {
    return [];
  }
}

function writeStoredSites() {
  if (typeof window === "undefined") return;
  const fixtureIds = new Set(Object.values(brandsByWorkspace).flat().map((b) => b.id));
  const added = Object.entries(state.brands).flatMap(([workspaceId, list]) =>
    list.filter((b) => !fixtureIds.has(b.id)).map((brand) => ({ workspaceId, brand })),
  );
  try {
    window.localStorage.setItem(SITES_STORAGE_KEY, JSON.stringify(added));
  } catch {
    // Storage blocked: the site still lives in memory until reload.
  }
}

for (const { workspaceId, brand } of readStoredSites()) {
  const list = (state.brands[workspaceId] ??= []);
  if (!list.some((b) => b.id === brand.id)) list.push(brand);
}

export async function getMe(): Promise<Me> {
  await wait();
  return clone(state.me);
}

export async function updateMe(patch: Partial<Pick<Me, "name" | "locale" | "theme" | "timezone">>): Promise<Me> {
  await wait(150);
  state.me = { ...state.me, ...patch };
  return clone(state.me);
}

export async function listWorkspaces(): Promise<Workspace[]> {
  await wait();
  return clone(state.workspaces);
}

export async function createWorkspace(name: string): Promise<Workspace> {
  await wait(500);
  const created: Workspace = {
    id: `ws_${state.workspaces.length + 1}_${name.length}`,
    name,
    role: "owner",
    plan: { id: "plan_free", name: "Free", tier: "free", isTopTier: false },
    memberCount: 1,
    brandCount: 0,
    lastBrandSlug: null,
  };
  state.workspaces.push(created);
  state.brands[created.id] = [];
  return clone(created);
}

export async function listBrands(workspaceId: string): Promise<Brand[]> {
  await wait();
  const list = state.brands[workspaceId];
  if (!list) throw new MockError(404, "workspace_not_found");
  return clone(list);
}

/** Top-level paths a site slug must not shadow. */
const RESERVED_SLUGS = new Set([
  "sites", "settings", "workspaces", "upgrade", "resellers", "agency", "admin", "integrations",
  "onboarding", "sign-in", "sign-up", "verify", "forgot-password", "api", "dev",
  "privacy-policy", "terms-of-service", "refund-policy",
]);

function uniqueSlug(base: string) {
  const taken = new Set(Object.values(state.brands).flat().map((b) => b.slug));
  const root = base || "site";
  let slug = RESERVED_SLUGS.has(root) ? `${root}-site` : root;
  for (let n = 2; taken.has(slug); n++) slug = `${root}-${n}`;
  return slug;
}

/** "netsach-tech.co" → "Netsach Tech". The crawl replaces it with the site's own name. */
export function nameFromDomain(domain: string) {
  return (domain.split(".")[0] ?? domain)
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const faviconFor = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

/** Sites page rows: every brand in the workspace with its headline numbers. */
export async function listSites(workspaceId: string): Promise<SiteListItem[]> {
  const brands = await listBrands(workspaceId);
  return brands.map((brand) => ({ ...brand, stats: siteStats[brand.id] ?? emptyStats }));
}

const emptyStats: SiteListItem["stats"] = { clustersCovered: 0, clustersTotal: 0, visibility: null, trend: [] };
const siteStats: Record<string, SiteListItem["stats"]> = {
  br_northwind: {
    clustersCovered: 18,
    clustersTotal: 42,
    visibility: 47,
    trend: [31, 33, 32, 36, 38, 37, 41, 43, 42, 45, 46, 47],
  },
  br_harbor: { clustersCovered: 6, clustersTotal: 30, visibility: 22, trend: [14, 15, 15, 17, 16, 18, 19, 20, 22] },
};

export async function getSite(siteId: string): Promise<{ site: Brand; workspaceId: string }> {
  await wait(200);
  for (const [workspaceId, list] of Object.entries(state.brands)) {
    const site = list.find((b) => b.id === siteId);
    if (site) return { site: clone(site), workspaceId };
  }
  throw new MockError(404, "site_not_found");
}

/** Step 2a: the domain becomes a site that setup then fills in. */
export async function createSite(workspaceId: string, domain: string): Promise<Brand> {
  await wait(700);
  const list = state.brands[workspaceId];
  if (!list) throw new MockError(404, "workspace_not_found");
  if (Object.values(state.brands).flat().some((b) => b.domain === domain)) throw new MockError(409, "site_exists");
  const site: Brand = {
    id: `br_${Date.now().toString(36)}`,
    slug: uniqueSlug((domain.split(".")[0] ?? "").replace(/[^a-z0-9-]/g, "")),
    name: nameFromDomain(domain),
    domain,
    contentLanguage: "en",
    market: "US",
    faviconUrl: faviconFor(domain),
    setupStep: "details",
  };
  list.push(site);
  const workspace = state.workspaces.find((w) => w.id === workspaceId);
  if (workspace) workspace.brandCount += 1;
  writeStoredSites();
  return clone(site);
}

export async function updateSite(siteId: string, patch: Partial<Omit<Brand, "id" | "slug">>): Promise<Brand> {
  await wait(150);
  for (const list of Object.values(state.brands)) {
    const site = list.find((b) => b.id === siteId);
    if (site) {
      Object.assign(site, patch);
      writeStoredSites();
      return clone(site);
    }
  }
  throw new MockError(404, "site_not_found");
}

export async function getUsage(workspaceId: string): Promise<Usage> {
  await wait();
  const usage = usageByWorkspace[workspaceId];
  if (usage) return clone(usage);
  // New workspaces start on Free.
  return {
    plan: { id: "plan_free", name: "Free", tier: "free", isTopTier: false },
    credits: { remaining: 200, total: 200 },
    breakdown: { scans: { used: 0, limit: 4 }, articles: { used: 0, limit: 2 }, prompts: { used: 0, limit: 25 } },
    renewsAt: new Date("2026-11-01T00:00:00Z").toISOString(),
  };
}

export async function getBrandSummary(brandId: string, range: Range): Promise<BrandSummary> {
  await wait(500);
  const known = Object.values(state.brands)
    .flat()
    .some((b) => b.id === brandId);
  if (!known) throw new MockError(404, "brand_not_found");
  return brandSummary(brandId, range);
}

export async function listNotifications(): Promise<Notification[]> {
  await wait();
  return clone(state.notifications);
}

export async function markAllNotificationsRead(): Promise<void> {
  await wait(150);
  state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
}

export async function getAgentThread() {
  await wait();
  return clone(state.thread);
}

/** Stores the user's message and Orbit's reply, which answers in the UI language. */
export async function sendAgentMessage(text: string, locale: string): Promise<AgentMessage> {
  await wait(900);
  const now = new Date();
  const user: AgentMessage = {
    id: `msg_${state.thread.messages.length + 1}`,
    role: "user",
    createdAt: now.toISOString(),
    source: "web",
    body: text,
    approval: null,
    task: null,
  };
  const reply: AgentMessage = {
    id: `msg_${state.thread.messages.length + 2}`,
    role: "agent",
    createdAt: new Date(now.getTime() + 1500).toISOString(),
    source: "web",
    body:
      locale === "ar"
        ? "أتحقق من ذلك الآن. سأنشر الأرقام هنا وعلى تيليجرام عند انتهاء إعادة الفحص."
        : "I'm checking that now. I'll post the numbers here and on Telegram when the recheck finishes.",
    approval: null,
    task: null,
  };
  state.thread.messages.push(user, reply);
  return clone(user);
}

/** Approve or reject. Approvals raised outside the agent thread (audit, action plan) are accepted too. */
export async function decideApproval(
  approvalId: string,
  decision: "approve" | "reject",
): Promise<Pick<Approval, "id" | "status">> {
  await wait(600);
  const status = decision === "approve" ? "approved" : "rejected";
  const message = state.thread.messages.find((m) => m.approval?.id === approvalId);
  if (message?.approval) message.approval = { ...message.approval, status };
  return { id: approvalId, status };
}
