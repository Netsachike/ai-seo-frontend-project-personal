import { http, HttpResponse, delay } from "msw";

import type { Me, Range } from "@/lib/api/types";
import { API_URL } from "@/lib/api/client";
import {
  agentThread,
  brandSummary,
  brandsByWorkspace,
  me,
  notifications,
  usageByWorkspace,
  workspaces,
} from "./fixtures";
import { getMockJob } from "./jobs";

const url = (path: string) => `${API_URL}${path}`;
const latency = () => delay(process.env.NODE_ENV === "test" ? 0 : 250);

const problem = (status: number, code: string, title: string) => HttpResponse.json({ status, code, title }, { status });

/** In-memory state for mutations; resets on reload. */
const state = { me: { ...me }, notifications: notifications.map((n) => ({ ...n })) };

const brandIndex = () => Object.values(brandsByWorkspace).flat();

export const handlers = [
  http.get(url("/me"), async () => {
    await latency();
    return HttpResponse.json(state.me);
  }),

  http.patch(url("/me"), async ({ request }) => {
    const patch = (await request.json()) as Partial<Me>;
    state.me = { ...state.me, ...patch };
    return HttpResponse.json(state.me);
  }),

  http.get(url("/workspaces"), async () => {
    await latency();
    return HttpResponse.json(workspaces);
  }),

  http.post(url("/workspaces"), async ({ request }) => {
    const { name } = (await request.json()) as { name: string };
    const created = {
      id: `ws_${Date.now()}`,
      name,
      role: "owner" as const,
      plan: { id: "plan_free", name: "Free", tier: "free" as const, isTopTier: false },
      memberCount: 1,
      brandCount: 0,
      lastBrandSlug: null,
    };
    workspaces.push(created);
    brandsByWorkspace[created.id] = [];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(url("/workspaces/:workspaceId/brands"), async ({ params }) => {
    await latency();
    const list = brandsByWorkspace[String(params.workspaceId)];
    return list ? HttpResponse.json(list) : problem(404, "workspace_not_found", "Workspace not found");
  }),

  http.get(url("/workspaces/:workspaceId/usage"), async ({ params }) => {
    await latency();
    const usage = usageByWorkspace[String(params.workspaceId)];
    return usage ? HttpResponse.json(usage) : problem(404, "workspace_not_found", "Workspace not found");
  }),

  http.get(url("/brands/:brandId/summary"), async ({ params, request }) => {
    await delay(500);
    const brandId = String(params.brandId);
    if (!brandIndex().some((b) => b.id === brandId)) return problem(404, "brand_not_found", "Brand not found");
    const range = (new URL(request.url).searchParams.get("range") ?? "30d") as Range;
    return HttpResponse.json(brandSummary(brandId, range));
  }),

  http.get(url("/jobs/:jobId"), ({ params }) => HttpResponse.json(getMockJob(String(params.jobId)))),

  http.get(url("/notifications"), async () => {
    await latency();
    return HttpResponse.json(state.notifications);
  }),

  http.post(url("/notifications/read-all"), () => {
    state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(url("/agent/threads/:threadId"), async () => {
    await latency();
    return HttpResponse.json(agentThread);
  }),

  http.post(url("/agent/messages"), async ({ request }) => {
    const { text } = (await request.json()) as { text: string; locale: string };
    const now = Date.now();
    const userMessage = {
      id: `msg_${now}`,
      role: "user" as const,
      createdAt: new Date(now).toISOString(),
      source: "web" as const,
      body: text,
      approval: null,
      task: null,
    };
    agentThread.messages.push(userMessage, {
      id: `msg_${now}_reply`,
      role: "agent",
      createdAt: new Date(now + 1500).toISOString(),
      source: "web",
      body: "I'm checking that now. I'll post the numbers here and on Telegram when the recheck finishes.",
      approval: null,
      task: null,
    });
    await delay(900);
    return HttpResponse.json(userMessage, { status: 201 });
  }),

  http.post(url("/approvals/:approvalId/decision"), async ({ params, request }) => {
    await delay(600);
    const { decision } = (await request.json()) as { decision: "approve" | "reject" };
    const message = agentThread.messages.find((m) => m.approval?.id === params.approvalId);
    if (!message?.approval) return problem(404, "approval_not_found", "Approval not found");
    message.approval = { ...message.approval, status: decision === "approve" ? "approved" : "rejected" };
    return HttpResponse.json(message.approval);
  }),
];
