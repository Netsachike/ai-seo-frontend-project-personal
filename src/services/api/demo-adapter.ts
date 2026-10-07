import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import { getSessionUserFromCookie } from "@/lib/auth-session";
import { getActivePlan } from "@/lib/plan-core";
import { DEMO_LOGIN_USER } from "@/lib/demo-login";
import { DEMO_USER_ID } from "@/lib/demo-session";
import type {
  AllUserSubscriptionsNew,
  AllUserWorkspace,
  getEmailCampaignData,
  User,
  Workspace,
} from "@/types/shared";
import type { CustomDomainConfig } from "@/services/custom-domain";

/**
 * In-browser stand-in for the shared Netsach backend, used only when
 * NEXT_PUBLIC_API_BASE_URL is unset (local runs and preview deploys). It
 * answers the same routes with the same response shapes the services expect,
 * so the account pages behave as they will against the real API. State lives
 * in memory and resets on reload.
 *
 * Plan limits are simulated so the "error mentions upgrade → /upgrade" path
 * can be seen: Free allows 1 workspace and no team members, Growth
 * (professional) allows 2 workspaces.
 */

type Json = Record<string, unknown>;
type Handler = (req: DemoRequest) => Json | Promise<Json>;
type DemoRequest = { params: Record<string, string>; query: Record<string, unknown>; body: Json };

const now = () => new Date().toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

class DemoHttpError extends Error {
  constructor(
    public status: number,
    public body: Json,
  ) {
    super(String(body.message ?? "Request failed"));
  }
}

const fail = (status: number, message: string, errors?: Record<string, string[]>): never => {
  throw new DemoHttpError(status, { status: "error", message, ...(errors ? { errors } : {}) });
};

// ── Seed data ────────────────────────────────────────────────────────────

const workspaceRecord = (id: number, name: string, isDefault = false): Workspace => ({
  id,
  user_id: DEMO_USER_ID,
  name,
  slug: slug(name),
  is_default: isDefault,
  logo: null,
  created_at: daysAgo(200 - id * 10),
  updated_at: daysAgo(5),
});

type DemoWorkspace = { workspace: Workspace; active: boolean };

// The signed-in account's workspaces, straight from the login response (lib/demo-login.ts).
const [GREEK, ANOTHERWORK] = DEMO_LOGIN_USER.user_workspaces;
const seedPivots = DEMO_LOGIN_USER.all_user_workspaces;

function seedWorkspace(id: number): Workspace {
  const pivot = seedPivots.find((p) => p.work_space_id === id);
  if (!pivot) throw new Error(`Unknown demo workspace ${id}`);
  return { ...pivot.workspace };
}

const freeSubs: AllUserSubscriptionsNew = { plan: "free", addons: [] };

function makeUser(
  id: number,
  first: string,
  last: string,
  extra: Partial<User> & { workspaceIds?: number[]; daysOld?: number } = {},
): User {
  const { workspaceIds = [GREEK], daysOld = 30, ...rest } = extra;
  return {
    id,
    name: `${first} ${last}`,
    first_name: first,
    last_name: last,
    email: `${first}.${last}`.normalize("NFD").toLowerCase().replace(/[^a-z.]/g, "") + "@example.com",
    email_verified_at: daysAgo(daysOld),
    role: "team_member",
    token: null,
    token_balance: 250,
    is_active: 1,
    parent_id: String(DEMO_USER_ID),
    admin_id: 0,
    uuid: null,
    added_by: "owner",
    created_at: daysAgo(daysOld),
    updated_at: daysAgo(Math.max(0, daysOld - 2)),
    edit_access: true,
    parsed_role: "Team member",
    // The settings page reads the pivot `id` as the workspace id, so the
    // demo keeps them equal.
    user_workspaces: workspaceIds,
    all_user_workspaces: workspaceIds.map((wsId) => ({
      id: wsId,
      user_id: id,
      work_space_id: wsId,
      is_active: wsId === GREEK ? 1 : 0,
      role: "member",
      created_at: daysAgo(daysOld),
      updated_at: daysAgo(daysOld),
      user_role: "member",
      user_count: 1,
      workspace: seedWorkspace(wsId),
    })),
    active_workspace: seedWorkspace(workspaceIds[0] ?? GREEK),
    subscriptions: freeSubs,
    account_officer: "",
    ...rest,
  };
}

const ADMIN_FIRST = ["Amara", "Bilal", "Chen", "Dana", "Emeka", "Fatima", "Gabriel", "Hana", "Ines", "Jonah", "Kemi", "Luca"];
const ADMIN_LAST = ["Okafor", "Haddad", "Wei", "Kowalski", "Mensah", "Rossi", "Tanaka"];

function seedAdminUsers(): User[] {
  const plans: AllUserSubscriptionsNew[] = [
    freeSubs,
    {
      subscription: {
        id: 900,
        name: "professional",
        status: true,
        platform: "paddle",
        type: "monthly",
        start_date: daysAgo(40),
        end_date: daysAgo(-20),
      },
      addons: [],
    },
    {
      subscription: {
        id: 901,
        name: "agency",
        status: true,
        platform: "paddle",
        type: "yearly",
        start_date: daysAgo(90),
        end_date: daysAgo(-275),
      },
      addons: { reseller_seats: { status: true, limit: 100 } },
    },
  ];
  const users: User[] = [];
  for (let i = 0; i < 34; i++) {
    const first = ADMIN_FIRST[i % ADMIN_FIRST.length];
    const last = ADMIN_LAST[(i * 5) % ADMIN_LAST.length];
    users.push(
      makeUser(100 + i, first, `${last}${i > 11 ? ` ${Math.floor(i / 12) + 1}` : ""}`, {
        daysOld: i < 2 ? 0 : i < 6 ? 3 : 10 + i * 4,
        role: i === 0 ? "admin" : "user",
        is_active: i % 9 === 4 ? 0 : 1,
        token_balance: (i * 137) % 1200,
        subscriptions: plans[i % plans.length],
        license_key: i % 7 === 3 ? `AS-${(48213 + i * 7919).toString(36).toUpperCase()}-ORB` : null,
        appsumo_license:
          i % 7 === 3
            ? {
                id: 5000 + i,
                user_id: 100 + i,
                license_key: `AS-${(48213 + i * 7919).toString(36).toUpperCase()}-ORB`,
                prev_license_key: null,
                event: "activate",
                last_event: "activate",
                status: "active",
                tier: (i % 3) + 1,
                activated: true,
                is_test: false,
                activated_at: daysAgo(20),
                deactivated_at: null,
                upgraded_at: null,
                downgraded_at: null,
                payload: {
                  test: false,
                  tier: (i % 3) + 1,
                  event: "activate",
                  license_key: "",
                  license_status: "active",
                },
              }
            : null,
      }),
    );
  }
  return users;
}

type DomainRecord = {
  id: number;
  workspace_id: number;
  domain: string;
  status: "active" | "pending";
  verified: boolean;
  configured: boolean;
  ssl_status: "active" | "pending";
  error: string | null;
  config: Partial<CustomDomainConfig> | null;
  created_at: string;
};

const db = {
  workspaces: seedPivots.map((p) => ({ workspace: { ...p.workspace }, active: p.is_active === 1 })) as DemoWorkspace[],
  team: [
    makeUser(11, "Ada", "Okafor", { workspaceIds: [GREEK, ANOTHERWORK], daysOld: 120, role: "admin", parsed_role: "Admin" }),
    makeUser(12, "Tomás", "Reyes", { workspaceIds: [GREEK], daysOld: 60, role: "editor", parsed_role: "Editor" }),
    makeUser(13, "Priya", "Nair", { workspaceIds: [ANOTHERWORK], daysOld: 25 }),
    makeUser(14, "Sam", "Lee", { workspaceIds: [ANOTHERWORK], daysOld: 9, role: "client", parsed_role: "Client" }),
  ],
  resellers: [
    makeUser(21, "Harbor", "Digital", { daysOld: 0, role: "reseller" }),
    makeUser(22, "Kestrel", "Media", { daysOld: 4, role: "reseller" }),
    makeUser(23, "Lumen", "Growth", { daysOld: 41, role: "reseller", is_active: 0 }),
  ],
  adminUsers: seedAdminUsers(),
  domains: [
    {
      id: 1,
      workspace_id: ANOTHERWORK,
      domain: "seo.adasagency.com",
      status: "active",
      verified: true,
      configured: true,
      ssl_status: "active",
      error: null,
      config: {
        brand_name: "Ada's SEO Desk",
        primary_color: "#0f766e",
        secondary_color: "#0b2a2a",
        background_color: "#071c1c",
        text_color: "#ecfdf5",
        button_color: "#0f766e",
        button_text_color: "#ffffff",
        default_theme: "user",
        login_carousel: null,
        support_email: "help@adasagency.com",
        reply_to_email: null,
        logo_url: null,
        logo_icon_url: null,
        favicon_url: null,
      },
      created_at: daysAgo(30),
    },
  ] as DomainRecord[],
  campaigns: [
    {
      id: 3,
      name: "October product update",
      subject: "New: AI Overviews tracking is live",
      content: "<p>Hi there,</p><p>You can now track Google AI Overviews next to ChatGPT and Claude.</p>",
      type: "bulk",
      total: 1240,
      sent: 1238,
      failed: 2,
      status: "completed",
      created_at: daysAgo(3),
      updated_at: daysAgo(3),
    },
    {
      id: 2,
      name: "Welcome follow-up",
      subject: "Your first visibility report is ready",
      content: "<p>Your first scan finished.</p>",
      type: "bulk_import",
      total: 310,
      sent: 120,
      failed: 0,
      status: "sending",
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
    },
    {
      id: 1,
      name: "Agency onboarding",
      subject: "Getting started with White Label",
      content: "<p>Welcome aboard.</p>",
      type: "individual",
      total: 1,
      sent: 1,
      failed: 0,
      status: "completed",
      created_at: daysAgo(12),
      updated_at: daysAgo(12),
    },
  ] as getEmailCampaignData[],
  nextId: 1000,
};

const nextId = () => ++db.nextId;

const currentPlan = () => getActivePlan(getSessionUserFromCookie()?.subscriptions);

function workspaceLimit() {
  const plan = currentPlan();
  return plan === "free" ? 1 : plan === "professional" ? 2 : Infinity;
}

function userWorkspacesPayload(): AllUserWorkspace[] {
  return db.workspaces.map(({ workspace, active }) => ({
    id: workspace.id,
    user_id: DEMO_USER_ID,
    work_space_id: workspace.id,
    is_active: active ? 1 : 0,
    role: seedPivots.find((p) => p.work_space_id === workspace.id)?.role ?? "owner",
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
    user_role: seedPivots.find((p) => p.work_space_id === workspace.id)?.user_role ?? "owner",
    user_count: 1 + db.team.filter((m) => m.user_workspaces.includes(workspace.id)).length,
    workspace,
  }));
}

function findWorkspace(id: unknown) {
  const match = db.workspaces.find((w) => w.workspace.id === Number(id));
  if (!match) fail(404, "Workspace not found.");
  return match as DemoWorkspace;
}

function applyUserAccess(user: User, access: unknown) {
  const ids = Array.isArray(access)
    ? access.filter((a) => a?.has_access).map((a) => Number(a.id))
    : user.user_workspaces;
  user.user_workspaces = ids;
  user.all_user_workspaces = ids.map((wsId) => ({
    id: wsId,
    user_id: user.id,
    work_space_id: wsId,
    is_active: 0,
    role: "member",
    created_at: now(),
    updated_at: now(),
    user_role: "member",
    user_count: 1,
    workspace: findWorkspace(wsId).workspace,
  }));
}

function requireFields(body: Json, fields: string[]) {
  const errors: Record<string, string[]> = {};
  for (const field of fields) {
    if (!String(body[field] ?? "").trim()) errors[field] = [`The ${field.replace(/_/g, " ")} field is required.`];
  }
  if (Object.keys(errors).length) fail(422, "The given data was invalid.", errors);
}

function checkPasswords(body: Json) {
  if (body.password !== body.password_confirmation) {
    fail(422, "The password confirmation does not match.", {
      password: ["The password confirmation does not match."],
    });
  }
}

function emailTaken(list: User[], email: unknown, exceptId?: number) {
  return list.some((u) => u.email.toLowerCase() === String(email).toLowerCase() && u.id !== exceptId);
}

function nameParts(body: Json) {
  const first = String(body.first_name ?? "").trim();
  const last = String(body.last_name ?? "").trim();
  return { first_name: first, last_name: last, name: `${first} ${last}`.trim() };
}

function subscriptionsFromAdmin(body: Json): AllUserSubscriptionsNew {
  const plan = String(body.plan ?? "free");
  const addons = (body.addons as Json | null) ?? [];
  if (plan === "free") return { plan: "free", addons: addons as AllUserSubscriptionsNew["addons"] };
  return {
    subscription: {
      id: nextId(),
      name: plan as "professional" | "agency" | "reseller",
      status: true,
      platform: "paddle",
      type: (body.billing_type as "monthly" | "yearly" | "lifetime") ?? "monthly",
      start_date: now(),
      end_date: daysAgo(-30),
    },
    addons: addons as AllUserSubscriptionsNew["addons"],
  };
}

const PER_PAGE = 10;

function adminPage(page: number, search?: string) {
  const query = (search ?? "").toLowerCase();
  const matches = db.adminUsers.filter(
    (u) =>
      !query ||
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query),
  );
  const lastPage = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const current = Math.min(Math.max(1, page), lastPage);
  const data = matches.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  return {
    current_page: current,
    data,
    first_page_url: "/admin?page=1",
    from: data.length ? (current - 1) * PER_PAGE + 1 : 0,
    last_page: lastPage,
    last_page_url: `/admin?page=${lastPage}`,
    links: [],
    next_page_url: current < lastPage ? `/admin?page=${current + 1}` : null,
    path: "/admin",
    per_page: PER_PAGE,
    prev_page_url: current > 1 ? `/admin?page=${current - 1}` : null,
    to: (current - 1) * PER_PAGE + data.length,
    total: matches.length,
  };
}

const within = (iso: string, days: number) => Date.now() - new Date(iso).getTime() < days * 86_400_000;

function findAdminUser(id: unknown) {
  const user = db.adminUsers.find((u) => u.id === Number(id));
  if (!user) fail(404, "User not found.");
  return user as User;
}

// ── Routes ───────────────────────────────────────────────────────────────

const routes: Array<[method: string, pattern: string, handler: Handler]> = [
  // Workspaces
  [
    "get",
    "/workspace",
    () => ({
      status: "success",
      currentWorkspace: db.workspaces.filter((w) => w.active).map((w) => w.workspace),
      userWorkspaces: userWorkspacesPayload(),
    }),
  ],
  [
    "post",
    "/workspace/store",
    ({ body }) => {
      requireFields(body, ["name"]);
      if (db.workspaces.length >= workspaceLimit()) {
        fail(403, "You have reached your workspace limit. Upgrade your plan to add more workspaces.");
      }
      const workspace = { ...workspaceRecord(nextId(), String(body.name)), slug: String(body.slug || slug(String(body.name))) };
      db.workspaces.push({ workspace, active: false });
      return { status: "success", message: "Workspace created.", workspace };
    },
  ],
  [
    "post",
    "/workspace/update",
    ({ body }) => {
      requireFields(body, ["name"]);
      const match = findWorkspace(body.id);
      match.workspace = { ...match.workspace, name: String(body.name), slug: String(body.slug), updated_at: now() };
      return { status: "success", message: "Workspace updated.", workspace: match.workspace };
    },
  ],
  [
    "post",
    "/workspaces/:id",
    ({ params }) => {
      const match = findWorkspace(params.id);
      db.workspaces.forEach((w) => (w.active = w === match));
      return { status: "success", message: "Workspace activated." };
    },
  ],
  [
    "post",
    "/workspace/delete",
    ({ body }) => {
      const match = findWorkspace(body.id);
      if (db.workspaces.length === 1) fail(422, "You can't delete your only workspace.");
      if (match.active) fail(422, "Switch to another workspace before deleting the active one.");
      db.workspaces = db.workspaces.filter((w) => w !== match);
      db.domains = db.domains.filter((d) => d.workspace_id !== match.workspace.id);
      return { status: "success", message: "Workspace deleted." };
    },
  ],

  // Team members
  [
    "get",
    "/team",
    () => ({
      status: "success",
      currentWorkspace: (db.workspaces.find((w) => w.active) ?? db.workspaces[0]).workspace,
      workspaces: db.workspaces.map((w) => w.workspace),
      users: db.team,
    }),
  ],
  [
    "post",
    "/team/add",
    ({ body }) => {
      if (currentPlan() === "free") fail(403, "Team members aren't included on Free. Upgrade your plan to invite your team.");
      requireFields(body, ["first_name", "last_name", "email", "password"]);
      if (emailTaken(db.team, body.email)) fail(422, "The email has already been taken.", { email: ["The email has already been taken."] });
      const user = makeUser(nextId(), "", "", { daysOld: 0 });
      Object.assign(user, nameParts(body), { email: String(body.email), role: String(body.role), parsed_role: String(body.role) });
      applyUserAccess(user, body.user_access);
      db.team.push(user);
      return { status: "success", message: "Team member added.", user };
    },
  ],
  [
    "post",
    "/team/update",
    ({ body }) => {
      const user = db.team.find((u) => u.id === Number(body.id));
      if (!user) return fail(404, "Team member not found.");
      if (emailTaken(db.team, body.email, user.id)) fail(422, "The email has already been taken.");
      Object.assign(user, nameParts(body), { email: String(body.email), role: String(body.role), updated_at: now() });
      applyUserAccess(user, body.user_access);
      return { status: "success", message: "Team member updated.", user };
    },
  ],
  [
    "post",
    "/team/update/password",
    ({ body }) => {
      checkPasswords(body);
      return { status: "success", message: "Password updated." };
    },
  ],
  [
    "delete",
    "/team/delete",
    ({ body }) => {
      db.team = db.team.filter((u) => u.id !== Number(body.id));
      return { status: "success", message: "Team member deleted." };
    },
  ],

  // Subscriptions
  [
    "post",
    "/cancle/subscription",
    () => ({ success: true, message: "Subscription renewal cancelled.", errors: null }),
  ],
  [
    "get",
    "/users/:id/addons/reseller-seats/access",
    () => {
      const addons = getSessionUserFromCookie()?.subscriptions?.addons;
      const hasAccess = Boolean(addons && !Array.isArray(addons) && addons.reseller_seats?.status);
      return { status: "success", has_access: hasAccess };
    },
  ],

  // Custom domains (White Label)
  ["get", "/custom-domains/resolve", () => ({ success: false, message: "No tenant owns this domain." })],
  ["get", "/custom-domains", () => ({ success: true, data: db.domains })],
  [
    "post",
    "/custom-domains",
    ({ body }) => {
      const domain = String(body.domain ?? "").trim().toLowerCase();
      if (!domain) fail(422, "The domain field is required.");
      if (db.domains.some((d) => d.domain === domain)) fail(422, "This domain is already registered.");
      const active = db.workspaces.find((w) => w.active) ?? db.workspaces[0];
      const record: DomainRecord = {
        id: nextId(),
        workspace_id: Number(body.workspace_id ?? active.workspace.id),
        domain,
        status: "pending",
        verified: false,
        configured: false,
        ssl_status: "pending",
        error: null,
        config: (body.config as Partial<CustomDomainConfig>) ?? null,
        created_at: now(),
      };
      db.domains.push(record);
      return { success: true, message: "Domain saved.", data: record };
    },
  ],
  [
    "patch",
    "/custom-domains/:id/config",
    ({ params, body }) => {
      const record = db.domains.find((d) => d.id === Number(params.id));
      if (!record) return fail(404, "Domain not found.");
      record.config = (body.config as Partial<CustomDomainConfig>) ?? record.config;
      return { success: true, message: "Branding saved.", data: record };
    },
  ],
  [
    "patch",
    "/custom-domains/:id/verification",
    ({ params, body }) => {
      const record = db.domains.find((d) => d.id === Number(params.id));
      if (!record) return fail(404, "Domain not found.");
      Object.assign(record, {
        verified: Boolean(body.verified),
        configured: Boolean(body.configured),
        status: body.status === "active" ? "active" : "pending",
        ssl_status: body.ssl_status === "active" ? "active" : "pending",
        error: (body.error as string | null) ?? null,
      });
      return { success: true, data: record };
    },
  ],
  [
    "delete",
    "/custom-domains/:id",
    ({ params }) => {
      db.domains = db.domains.filter((d) => d.id !== Number(params.id));
      return { success: true, message: "Domain removed." };
    },
  ],

  // Uploads: the file stays in this browser as an object URL.
  ["post", "/upload-loacal-image", ({ body }) => ({ status: "success", url: body.__fileUrl as string })],
  ["post", "/upload-gif", ({ body }) => ({ status: "success", filePath: body.__fileUrl as string })],

  // Reseller console
  [
    "get",
    "/reseller",
    () => ({
      status: "success",
      page: "1",
      workspace: db.workspaces[0].workspace,
      users: db.resellers,
      sumOfUsers: db.resellers.length,
      sumOfUsersToday: db.resellers.filter((u) => within(u.created_at, 1)).length,
      sumOfUsersThisWeek: db.resellers.filter((u) => within(u.created_at, 7)).length,
    }),
  ],
  [
    "post",
    "/reseller/add",
    ({ body }) => {
      requireFields(body, ["first_name", "last_name", "email", "password"]);
      if (emailTaken(db.resellers, body.email)) fail(422, "The email has already been taken.");
      const user = makeUser(nextId(), "", "", { daysOld: 0, role: "reseller" });
      Object.assign(user, nameParts(body), { email: String(body.email), is_active: body.is_active ? 1 : 0 });
      db.resellers.unshift(user);
      return { status: "success", message: "Reseller added.", user: [user] };
    },
  ],
  [
    "post",
    "/reseller/update/details",
    ({ body }) => {
      const user = db.resellers.find((u) => u.id === Number(body.id));
      if (!user) return fail(404, "Reseller not found.");
      Object.assign(user, nameParts(body), { email: String(body.email), is_active: body.is_active ? 1 : 0 });
      return { status: "success", message: "Reseller updated.", user: [user] };
    },
  ],
  [
    "post",
    "/reseller/update/password",
    ({ body }) => {
      checkPasswords(body);
      return { status: "success", message: "Password updated." };
    },
  ],
  [
    "delete",
    "/reseller/delete",
    ({ body }) => {
      db.resellers = db.resellers.filter((u) => u.id !== Number(body.id));
      return { status: "success", message: "Reseller deleted." };
    },
  ],

  // Admin console
  [
    "get",
    "/admin",
    ({ query }) => ({
      status: "success",
      stats: {
        total_users: db.adminUsers.length,
        users_today: db.adminUsers.filter((u) => within(u.created_at, 1)).length,
        users_this_week: db.adminUsers.filter((u) => within(u.created_at, 7)).length,
      },
      users: adminPage(Number(query.page ?? 1), query.search as string | undefined),
    }),
  ],
  [
    "post",
    "/admin/users/add",
    ({ body }) => {
      requireFields(body, ["first_name", "last_name", "email", "password"]);
      if (emailTaken(db.adminUsers, body.email)) fail(422, "The email has already been taken.");
      const user = makeUser(nextId(), "", "", { daysOld: 0 });
      Object.assign(user, nameParts(body), {
        email: String(body.email),
        role: String(body.role ?? "member"),
        is_active: body.is_active ? 1 : 0,
        subscriptions: subscriptionsFromAdmin(body),
      });
      db.adminUsers.unshift(user);
      return { status: "success", message: "User created.", user };
    },
  ],
  [
    "post",
    "/admin/users/update/details",
    ({ body }) => {
      const user = findAdminUser(body.id);
      const addons = user.subscriptions?.addons ?? [];
      Object.assign(user, nameParts(body), {
        email: String(body.email),
        role: String(body.role),
        is_active: body.is_active ? 1 : 0,
        subscriptions: { ...subscriptionsFromAdmin({ ...body, addons: null }), addons },
      });
      return { status: "success", message: "User updated.", user };
    },
  ],
  [
    "post",
    "/admin/addon/update",
    ({ body }) => {
      const user = findAdminUser(body.user_id);
      user.subscriptions = { ...user.subscriptions, addons: body.addons as AllUserSubscriptionsNew["addons"] };
      return { status: "success", message: "Add-ons updated." };
    },
  ],
  [
    "post",
    "/admin/users/update/password",
    ({ body }) => {
      findAdminUser(body.user_id);
      checkPasswords(body);
      return { status: "success", message: "Password updated." };
    },
  ],
  [
    "post",
    "/admin/users/delete",
    ({ body }) => {
      const user = findAdminUser(body.user_id);
      if (user.role === "admin") fail(422, "Admin accounts can't be deleted.");
      db.adminUsers = db.adminUsers.filter((u) => u !== user);
      return { status: "success", message: "User deleted." };
    },
  ],
  [
    "post",
    "/activateUser",
    ({ body }) => {
      findAdminUser(body.id).is_active = 1;
      return { status: "success", message: "User activated." };
    },
  ],
  [
    "post",
    "/deactivateUser",
    ({ body }) => {
      findAdminUser(body.id).is_active = 0;
      return { status: "success", message: "User deactivated." };
    },
  ],
  [
    "post",
    "/admin/users/credits/add",
    ({ body }) => {
      const user = findAdminUser(body.user_id);
      user.token_balance = Number(user.token_balance ?? 0) + Number(body.amount);
      return { status: "success", message: "Credits added." };
    },
  ],
  [
    "post",
    "/admin/users/credits/update",
    ({ body }) => {
      findAdminUser(body.user_id).token_balance = Number(body.amount);
      return { status: "success", message: "Credits updated." };
    },
  ],

  // Email marketing
  ["get", "/all/email/campaign", () => ({ current_page: 1, data: db.campaigns })],
  [
    "post",
    "/user/sendCampaign",
    ({ body }) => {
      const recipients = Array.isArray(body.bulk_recipients) ? body.bulk_recipients.length : 0;
      const total = body.type === "bulk_import" ? 48 : Math.max(recipients, 1);
      const campaign: getEmailCampaignData = {
        id: nextId(),
        name: String(body.name),
        subject: String(body.subject),
        content: String(body.content),
        type: String(body.type),
        total,
        sent: 0,
        failed: 0,
        status: "queued",
        created_at: now(),
        updated_at: now(),
      };
      db.campaigns.unshift(campaign);
      return { status: true, camapaign_id: campaign.id, message: "Campaign queued." };
    },
  ],
];

// ── Adapter ──────────────────────────────────────────────────────────────

function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/");
  const b = path.split("/");
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

function readBody(data: unknown): Json {
  if (!data) return {};
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    const body: Json = {};
    data.forEach((value, key) => {
      if (typeof value === "string") body[key] = value;
      else body.__fileUrl = URL.createObjectURL(value);
    });
    return body;
  }
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Json;
    } catch {
      return {};
    }
  }
  return data as Json;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? "get").toLowerCase();
  const [path, search = ""] = (config.url ?? "").split("?");
  const query: Record<string, unknown> = { ...Object.fromEntries(new URLSearchParams(search)), ...config.params };

  await wait(method === "get" ? 350 : 650);

  const respond = (status: number, data: unknown): AxiosResponse => ({
    data,
    status,
    statusText: String(status),
    headers: new AxiosHeaders(),
    config,
    request: {},
  });

  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue;
    const params = match(pattern, path);
    if (!params) continue;
    try {
      return respond(200, await handler({ params, query, body: readBody(config.data) }));
    } catch (error) {
      if (!(error instanceof DemoHttpError)) throw error;
      const response = respond(error.status, error.body);
      throw new AxiosError(
        `Request failed with status code ${error.status}`,
        error.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response,
      );
    }
  }

  const response = respond(404, { status: "error", message: `Demo API has no route for ${method.toUpperCase()} ${path}` });
  throw new AxiosError(`Request failed with status code 404`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
};
