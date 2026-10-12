/**
 * In-memory mock data for features the backend does not serve yet: UI
 * preferences, usage meters, the overview trend summary, notifications and
 * approval decisions. Everything runs in the browser with a short delay, so
 * loading states are real, and resets on reload. Workspaces, sites and every
 * SEO module come from the backend (src/services).
 */
import type { Range } from "@/types/types";
import type { Approval, BrandSummary, Me, Notification, Usage } from "./types";
import {
  brandSummary,
  me as meFixture,
  notifications as notificationFixtures,
  usage as usageFixture,
} from "./fixtures";

const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const clone = <T>(value: T): T => structuredClone(value);

const state = {
  me: clone(meFixture),
  notifications: clone(notificationFixtures),
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

export async function getUsage(_workspaceId: string): Promise<Usage> {
  await wait();
  return clone(usageFixture);
}

/** Trend lines, KPI sparklines and share of voice over time. The backend has no history endpoint yet. */
export async function getBrandSummary(siteId: number, range: Range): Promise<BrandSummary> {
  await wait(500);
  return brandSummary(String(siteId), range);
}

export async function listNotifications(): Promise<Notification[]> {
  await wait();
  return clone(state.notifications);
}

export async function markAllNotificationsRead(): Promise<void> {
  await wait(150);
  state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
}

/** Approve or reject. The backend has no approval endpoint yet. */
export async function decideApproval(
  approvalId: string,
  decision: "approve" | "reject",
): Promise<Pick<Approval, "id" | "status">> {
  await wait(600);
  return { id: approvalId, status: decision === "approve" ? "approved" : "rejected" };
}
