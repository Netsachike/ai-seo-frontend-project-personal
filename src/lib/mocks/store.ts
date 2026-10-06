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
