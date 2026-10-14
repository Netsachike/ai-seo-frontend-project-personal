/**
 * The application's single source of type truth.
 *
 * 1. Shared account types: workspaces, team, subscriptions, reseller, admin
 *    and uploads, ported from the shared Netsach backend. Field names match
 *    the live API; do not rename them.
 * 2. AI SEO Platform API types: every request and response in
 *    docs/backend/docs/openapi.yaml.
 * 3. UI view models: the shapes screens render, built from the API types by
 *    the mappers in src/features/*.
 */

// ═════════════════════════════════════════════════════════════════════════
// SHARED ACCOUNT TYPES
// ═════════════════════════════════════════════════════════════════════════

// GLOBAL USER RELATED TYPES

// workspaces
export interface Workspace {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  is_default: boolean;
  logo: string | null;
  created_at: string;
  updated_at: string;
}

export interface AllUserWorkspace {
  id: number;
  user_id: number;
  work_space_id: number;
  is_active: number;
  role: string; // member, admin, owner
  created_at: string;
  updated_at: string;
  user_role: string;
  user_count: number;
  workspace: Workspace;
}

// subscriptions
export interface Subscription {
  id: string;
  status: boolean;
  limit: number;
  start_date: string;
  end_date: string;
  type: string;
  name: string;
}

export interface AllUserSubscriptions {
  front_end?: Subscription;
  front_end_pro: Subscription;
  viralgenius_media_studio: Subscription;
  viralgenius_affiliate_offer: Subscription;
  viralgenius_sales_converter: Subscription;
  viralgenius_agency: Subscription;
  reseller: Subscription;
  viralgenius_unlimited: Subscription;
}

export interface SubscriptionSeed {
  status: boolean;
  limit: number;
  start_date: string;
  end_date: string;
  type: string;
}

export interface SubscriptionsNew {
  front_end: SubscriptionSeed;
  viralgenius_unlimited: SubscriptionSeed;
  viralgenius_affiliate_offer: SubscriptionSeed;
  viralgenius_sales_converter: SubscriptionSeed;
  viralgenius_media_studio: SubscriptionSeed;
  viralgenius_agency: SubscriptionSeed;
  reseller: SubscriptionSeed;
}

export type SubscriptionDataNew = {
  id: number;
  name: "free" | "professional" | "agency" | "reseller";
  status: boolean;
  // Lifetime and manually granted plans come back with no platform or dates.
  platform: "jvz" | "paddle" | null;
  type: "monthly" | "yearly" | "lifetime";
  start_date: string | null;
  end_date: string | null;
  next_billed_at?: string | null;
  // Renewal cancelled flag: 0/false = renews, 1/true = set to expire at end_date.
  is_cancelled?: number | boolean;
};

export type AddOns = {
  remove_branding?: {
    id: number;
    status: boolean;
    type: string;
    start_date: string | null;
    end_date?: string | null;
    // Older payloads spell it end_data.
    end_data?: null;
  };
  reseller_seats?: {
    id?: number;
    status: boolean;
    type?: string;
    limit?: number;
    start_date?: string | null;
    end_date?: string | null;
  };
  [key: string]: unknown;
};

export interface AllUserSubscriptionsNew {
  // free accounts come back as { plan: "free", addons: [] }
  plan?: string;
  // paid accounts come back as { subscription: {...}, addons: {...} }
  subscription?: SubscriptionDataNew;
  addons: [] | AddOns;
}

// AppSumo license attached to a user that activated via AppSumo.
export interface AppsumoLicense {
  id: number;
  user_id: number;
  license_key: string;
  prev_license_key: string | null;
  event: string;
  last_event: string | null;
  status: string; // active, inactive, ...
  tier: number;
  activated: boolean;
  is_test: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  upgraded_at: string | null;
  downgraded_at: string | null;
  payload: {
    test: boolean;
    tier: number;
    event: string;
    license_key: string;
    license_status: string;
  };
}

// user types
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  social_provider?: string | null;
  social_provider_id?: string | null;
  social_avatar?: string | null;
  social_access_token?: string | null;
  social_refresh_token?: string | null;
  social_token_expires_at?: string | null;
  role: string;
  token: string | null;
  token_balance?: number | string | null;
  credit_balance?: number | string | null;
  tokens?: number | string | null;
  is_active: number;
  parent_id: string | null;
  admin_id: number;
  uuid: null;
  added_by: string;
  created_at: string;
  updated_at: string;
  edit_access: boolean;
  first_name: string;
  last_name: string;
  parsed_role: string;
  user_workspaces: number[];
  all_user_workspaces: AllUserWorkspace[];
  active_workspace: Workspace;
  subscriptions: AllUserSubscriptionsNew;
  account_officer: string;
  // Present only for users onboarded through AppSumo.
  license_key?: string | null;
  appsumo_license?: AppsumoLicense | null;
  // Set to true once the user completes or dismisses the onboarding tour.
  tour_completed?: boolean;
}

// Admin Types
export interface getAdminDashboardResponse {
  status: string;
  stats: {
    total_users: number;
    users_today: number;
    users_this_week: number;
  };
  users: {
    current_page: number;
    data: User[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

// Create User Payload
// POST /admin/users/add
export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
  subscriptions: SubscriptionsNew;
}

export interface CreateUserResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// Update User payload
// POST /admin/users/update/details
export interface UpdateUserPayload {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  role: string;
  is_active: boolean;
}

export interface UpdateUserResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// UPDATE USER SUBSCRIPTIONS
// POST /admin/users/update/subscriptions
export interface UpdateUserSubscriptionsPayload {
  user_id: number;
  subscriptions: {
    front_end: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_unlimited: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_affiliate_offer?: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_sales_converter?: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_media_studio?: {
      id: number;
      status: boolean;
      limit?: number;
    };
    reseller: {
      id: number;
      status: boolean;
      limit?: number;
    };
    viralgenius_agency: {
      id: number;
      status: boolean;
      limit?: number;
    };
  };
}

// POST /admin/users/update/password
export interface updateUserPasswordPayload {
  user_id: number;
  password: string;
  password_confirmation: string;
}

export interface UserCreditsPayload {
  user_id: number;
  amount: number;
}

export interface UserCreditsResponse {
  status: string;
  message: string;
}

export interface createEmailCampaignPayload {
  name: string;
  subject: string;
  type: "individual" | "bulk" | "bulk_import";
  recipient?: string;
  bulk_recipients?: string[];
  file?: File;
  content: string;
}

export interface createEmailCampaignResponse {
  status: boolean | string;
  camapaign_id?: number;
  message?: string;
}

export interface getEmailCampaignData {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: "individual" | "bulk" | "bulk_import" | string;
  total: number;
  sent: number;
  failed: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface getEmailCampaignResponse {
  current_page?: number;
  data: getEmailCampaignData[];
}

// New Admin User Update Types
// ADD NEW USER - POST - /admin/users/add
export interface AddNewUserFromAdminPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  plan: "free" | "professional" | "agency" | "reseller";
  billing_type: "lifetime" | "monthly" | "yearly";
  addons?: AddOns | null; // add a checkbox for remove branding to add it
}

export interface AddNewUserFromAdminResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

//UPDATE NEW USER - POST - /admin/users/update/details
export interface UpdateNewUserFromAdminPayload {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role: string;
  plan: "free" | "professional" | "agency" | "reseller";
  billing_type: "lifetime" | "monthly" | "yearly";
  addons?: AddOns | null; // add a checkbox for remove branding to add it
}

export interface UpdateNewUserFromAdminResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// UPDATE ADDONS - POST - /admin/addons/update
export interface UpdateAddonsPayload {
  user_id: number;
  addons: {
    remove_branding?: {
      status: boolean;
      type: "lifetime" | "monthly" | "yearly";
    };
    reseller_seats?: {
      status: boolean;
      limit: number;
    };
    [key: string]: unknown;
  };
}

export interface UpdateAddonsResponse {
  status: string;
  message: string;
}

// WORKSPACE ROUTES & TYPES
// CREATE WORKSPACE:
// create workspace route: POST /workspace/store
export interface CreateWorkspacePayload {
  name: string; // "My Workspace"
  slug: string; // "my-workspace"
  is_default: number; // 1 for true or 0 for false
  logo: File | null; // Optional logo file
}

export interface createWorkspaceResponse {
  status: string;
  message: string;
  workspace?: Workspace;
  errors?: {
    [key: string]: string[];
  };
}

// ACTIVATE WORKSPACE:
// activate workspace route: POST /workspace/activate
export interface ActivateWorkspacePayload {
  id: number; // ID of the workspace to activate
}

export interface ActivateWorkspaceResponse {
  status: string;
  message: string;
}

// GET ALL WORKSPACES:
// get all workspaces route: GET /workspace
export interface GetAllWorkspacesResponse {
  status: string;
  currentWorkspace: Workspace[];
  userWorkspaces: AllUserWorkspace[];
}

// UPDATE/EDIT WORKSPACE:
// edit workspace route: POST /workspace/update
export interface UpdateWorkspacePayload {
  id: number;
  name: string;
  slug: string;
  is_default: number;
}

export interface UpdateWorkspaceResponse {
  status: string;
  message: string;
  workspace?: Workspace;
  errors?: {
    [key: string]: string[];
  };
}

// DELETE WORKSPACE:
// delete workspace route: POST /workspace/delete
export interface DeleteWorkspacePayload {
  id: number; // ID of the workspace to delete
}

export interface DeleteWorkspaceResponse {
  status: string;
  message: string;
}

// TEAM MEMBER TYPES:
export interface TeamMember {
  account_officer: string;
  active_workspace: Workspace;
  added_by: string;
  admin_id: number;
  all_user_workspaces: AllUserWorkspace[];
  created_at: string;
  edit_access: boolean;
  email: string;
  email_verified_at: string | null;
  first_name: string;
  id: number;
  is_active: number; // or boolean if you want to normalize
  last_name: string;
  name: string;
  parent_id: number;
  parsed_role: string;
  role: string;
  subscriptions: AllUserSubscriptions;
  token: string | null;
  updated_at: string;
  user_workspaces: number[];
  uuid: string | null;
}

// ADD TEAM MEMBER:
// add team member route: POST /team/add
export interface AddTeamMemberPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  user_access: { id: number; has_access: boolean }[];
}

export interface AddTeamMemberResponse {
  status: string;
  message: string;
  user?: TeamMember;
  errors?: {
    [key: string]: string[];
  };
}

// GET ALL TEAM MEMBERS:
// get all team members route: GET /team
export interface GetAllTeamMembersResponse {
  status: string;
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  users?: User[];
  errors?: {
    [key: string]: string[];
  };
}

// UPDATE TEAM MEMBER:
// update team member route: "/team/update"
export interface UpdateTeamMemberPayload {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  password?: string;
  user_access: { id: number; has_access: boolean }[];
}

export interface UpdateTeamMemberResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// UPDATE TEAM MEMBER PASSWORD:
// update team member password route: "/team/update/password"
export interface UpdateTeamMemberPasswordPayload {
  id: number;
  password: string;
  password_confirmation: string;
}

export interface UpdateTeamMemberPasswordResponse {
  status: string;
  message: string;
  user?: User;
  errors?: {
    [key: string]: string[];
  };
}

// DELETE TEAM MEMBER:
// delete team member route: DELETE /team/delete
export interface DeleteTeamMemberPayload {
  id: number; // ID of the team member to delete
}

export interface DeleteTeamMemberResponse {
  status: string;
  message: string;
}

// RESELLER ROUTES & TYPES
// GET ALL RESELLERS:
// get all resellers route: GET /reseller
export interface GetAllResellersResponse {
  status: string;
  message?: string;
  page: string;
  workspace: Workspace;
  users: User[];
  sumOfUsers: number;
  sumOfUsersToday: number;
  sumOfUsersThisWeek: number;
}

// ADD RESELLER:
// add reseller route: POST /reseller/add
export interface AddResellerPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  is_active: boolean;
}

export interface AddResellerResponse {
  status: string;
  message: string;
  user?: User[];
}

// UPDATE RESELLER:
// update reseller route: POST /reseller/update/details
export interface UpdateResellerPayload {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

export interface UpdateResellerResponse {
  status: string;
  message: string;
  user?: User[];
}

// UPDATE RESELLER PASSWORD:
// update reseller password route: POST /reseller/update/password
export interface UpdateResellerPasswordPayload {
  id: number;
  password: string;
  password_confirmation: string;
}

export interface UpdateResellerPasswordResponse {
  status: string;
  message: string;
  user?: User[];
}

// DELETE RESELLER:
// delete reseller route: POST /reseller/delete
export interface DeleteResellerPayload {
  id: number; // ID of the reseller to delete
}

export interface DeleteResellerResponse {
  status: string;
  message: string;
}

// ─── LOCAL FILE UPLOADS (S3) ─────────────────────────────────────────────────
// These four endpoints take multipart form data and return a public S3 URL.
// They are inconsistent about the response key (`url` vs `filePath`), so
// `services/Upload.ts` normalises both into a single shape.

// POST /upload-loacal-image  (spelling is the live backend route)
export interface uploadLocalImageResponse {
  status: string;
  url: string;
  message?: string;
}

// POST /upload-gif
export interface uploadGifResponse {
  status: string;
  filePath: string;
  message?: string;
}

/** Normalised result returned by every UploadService method. */
export interface LocalUploadResult {
  status: string;
  url: string;
  message?: string;
}

/**
 * GET /users/:id/addons/reseller-seats/access — the backend's own answer on
 * whether this account owns the White Label add-on. It is the authority the
 * front end's `hasWhiteLabel` cookie read only approximates.
 */
export interface AddonAccessResponse {
  status: string;
  has_access: boolean;
}

// ═════════════════════════════════════════════════════════════════════════
// AI SEO PLATFORM API (docs/backend/docs/openapi.yaml)
// Field names and shapes match the spec exactly. Laravel serialises
// `decimal:N` columns as strings ("72.50"); they are typed `Decimal` and
// parsed with `toNumber()` in services/api/envelopes.ts.
// ═════════════════════════════════════════════════════════════════════════

/** A Laravel `decimal:N` column, serialised as a string such as "72.50". */
export type Decimal = string;
/** ISO 8601 date-time string. */
export type DateTime = string;
/** An object whose keys the backend does not fix. */
export type JsonObject = Record<string, unknown>;

// ── Envelopes ────────────────────────────────────────────────────────────

/** `{ success: true, message?, data }`, used by most module endpoints. */
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

/** Controller-handled error: `{ success: false, message, errors? }`. */
export interface ApiErrorEnvelope {
  success: false;
  message: string;
  errors?: Record<string, string[]> | null;
  [key: string]: unknown;
}

/** Laravel framework error (401, 404, 422 validation, 500): `{ message, errors? }`. */
export interface FrameworkError {
  message: string;
  errors?: Record<string, string[]>;
}

/** API Resource wrapper with no `success` key: `{ data }`. */
export interface ResourceEnvelope<T> {
  data: T;
}

/** Laravel `LengthAwarePaginator` JSON. */
export interface LaravelPaginator<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

/** API Resource collection built from a paginator. */
export interface ResourcePaginated<T> {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    links: JsonObject[];
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface PageParams {
  page?: number;
}

export interface PerPageParams extends PageParams {
  /** Max 100 */
  per_page?: number;
}

export type Priority = "critical" | "high" | "medium" | "low";

export interface PrioritySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// ── Authentication ───────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

/** `POST /login` → `data`. `user` is the full User model (see `User` above). */
export interface LoginData {
  user: User;
  token: string;
}

/** `GET /me` → `data` (UserResource). */
export interface UserResource {
  id: number;
  name: string;
  email: string;
  email_verified_at: DateTime | null;
  created_at: DateTime;
}

// ── Sites ────────────────────────────────────────────────────────────────

export const PLATFORMS = [
  "wordpress",
  "wordpress_com",
  "shopify",
  "wix",
  "webflow",
  "ghost",
  "duda",
  "nextjs",
  "lovable",
  "replit",
  "custom",
  "unknown",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface SiteSettings {
  description: string | null;
  target_audience: string[];
  services: string[];
  target_locations: string[];
  brand_voice: string | null;
  seo_enabled: boolean;
  ai_visibility_enabled: boolean;
}

/** SiteResource */
export interface Site {
  id: number;
  workspace_id: number;
  user_id: number;
  name: string;
  domain: string;
  url: string;
  business_name: string | null;
  industry: string | null;
  location: { country: string | null; state: string | null; city: string | null };
  language: string | null;
  platform: { name: Platform | string; detected: boolean; confidence: number | null };
  publishing: { method: string | null };
  /** Present only on show / create / platform responses. */
  settings?: SiteSettings;
  status: string;
  last_crawled_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface CreateSitePayload {
  name: string;
  url: string;
  business_name?: string | null;
  industry?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  language?: string | null;
  platform?: Platform;
  description?: string | null;
  target_audience?: string[] | null;
  services?: string[] | null;
  target_locations?: string[] | null;
  brand_voice?: string | null;
}

// ── Crawler ──────────────────────────────────────────────────────────────

export type CrawlRunStatus = "pending" | "running" | "completed" | "failed";

export interface CrawlRun {
  id: number;
  site_id: number;
  workspace_id: number;
  status: CrawlRunStatus;
  max_pages: number;
  respect_robots: boolean;
  crawl_delay_ms: number;
  pages_discovered: number;
  pages_crawled: number;
  pages_failed: number;
  started_at: DateTime | null;
  completed_at: DateTime | null;
  error_message: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface StartCrawlPayload {
  /** 1–10000, default 100 */
  max_pages?: number;
  respect_robots?: boolean;
  crawl_delay_ms?: number;
}

/** CrawlPageResource */
export interface CrawlPage {
  id: number;
  crawl_run_id: number;
  site_id: number;
  url: string;
  status_code: number | null;
  content_type: string | null;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  /** Raw HTML */
  content: string | null;
  content_text: string | null;
  content_summary: string | null;
  page_type: string | null;
  word_count: number | null;
  internal_links_count: number | null;
  external_links_count: number | null;
  indexable: boolean | null;
  canonical_url: string | null;
  headings: JsonObject[] | null;
  images: JsonObject[] | null;
  schema_types: string[] | null;
  error_message: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

/** Raw crawl page model when embedded as a relation. */
export interface CrawlPageModel extends CrawlPage {
  workspace_id: number;
  url_hash: string;
}

export interface CrawlPagesResponse {
  data: CrawlPage[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

// ── Keywords ─────────────────────────────────────────────────────────────

/** KeywordResource (`GET /sites/{site}/keywords`) */
export interface Keyword {
  id: number;
  site_id: number;
  keyword: string;
  language: string | null;
  location: { country: string | null; city: string | null };
  search_surface: string | null;
  status: string | null;
  signals: { branded: boolean; local: boolean; question: boolean; word_count: number | null };
  metrics: {
    search_volume: number | null;
    keyword_difficulty: Decimal | null;
    cpc: Decimal | null;
    opportunity_score: Decimal | null;
  };
  quality: {
    status: string | null;
    quality_score: Decimal | null;
    relevance_score: Decimal | null;
    rejection_reason: string | null;
  };
  scoring: { opportunity_score: Decimal | null; scored_at: DateTime | null };
  intent: string | null;
  cluster: string | null;
  /** Crawl page ID */
  target_page: number | null;
  created_at: DateTime;
  updated_at: DateTime;
}

/** Raw keyword model when embedded as a relation (flat columns). */
export interface KeywordModel {
  id: number;
  site_id: number;
  keyword: string;
  keyword_hash: string;
  language: string | null;
  country: string | null;
  city: string | null;
  search_surface: string | null;
  status: string | null;
  is_branded: boolean;
  is_local: boolean;
  is_question: boolean;
  word_count: number | null;
  search_volume: number | null;
  keyword_difficulty: Decimal | null;
  cpc: Decimal | null;
  opportunity_score: Decimal | null;
  intent: string | null;
  cluster_name: string | null;
  target_page_id: number | null;
  relevance_score: Decimal | null;
  quality_score: Decimal | null;
  quality_status: string | null;
  rejection_reason: string | null;
  scored_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface DiscoverKeywordsPayload {
  /** Up to 100, each 2–200 characters */
  seed_keywords?: string[];
}

export interface DiscoverKeywordsResult {
  keywords_discovered: number;
  seed_keywords_processed: number;
  pages_analyzed: number;
}

export interface AnalyzeKeywordsResult {
  quality: { processed: number; accepted: number; rejected: number };
  scoring: { processed: number };
  clustering: { clusters: number; keywords_updated: number };
}

// ── Topical maps ─────────────────────────────────────────────────────────

export interface TopicalMap {
  id: number;
  site_id: number;
  workspace_id: number;
  name: string;
  description: string | null;
  status: string;
  core_topics_count: number;
  clusters_count: number;
  keywords_count: number;
  mapped_keywords_count: number;
  coverage_score: Decimal;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface TopicalCluster {
  id: number;
  topical_map_id: number;
  name: string;
  core_topic: string | null;
  strategy: string | null;
  keyword_count: number;
  mapped_keyword_count: number;
  coverage_score: Decimal;
  authority_opportunity_score: Decimal;
  money_page: boolean;
  target_page_id: number | null;
  internal_link_opportunities: JsonObject[] | null;
  metadata: JsonObject | null;
  created_at: DateTime;
  updated_at: DateTime;
}

/** `GET /topical-maps` item */
export interface TopicalMapSummary extends TopicalMap {
  clusters: (TopicalCluster & { keywords_count: number; target_page: CrawlPageModel | null })[];
}

/** `GET /topical-maps/{id}` */
export interface TopicalMapDetail extends TopicalMap {
  clusters: (TopicalCluster & { target_page: CrawlPageModel | null; keywords: KeywordModel[] })[];
}

export interface BuildTopicalMapResult {
  topical_map: TopicalMap | null;
  clusters: number;
  keywords: number;
  mapped_keywords: number;
  /** Absent when the site has no usable keywords */
  coverage_score?: number;
}

// ── Search Console ───────────────────────────────────────────────────────

export interface GscConnection {
  id: number;
  user_id: number;
  workspace_id: number;
  site_id: number;
  google_email: string | null;
  token_expires_at: DateTime | null;
  scopes: string[] | null;
  property: string | null;
  status: string;
  last_synced_at: DateTime | null;
  last_error: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface GscQuery {
  id: number;
  site_id: number;
  workspace_id: number;
  date: DateTime;
  query: string;
  page: string;
  country: string | null;
  device: string | null;
  search_type: string | null;
  dimension_hash: string;
  clicks: number;
  impressions: number;
  ctr: Decimal;
  position: Decimal;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface GscProperty {
  property: string;
  permission_level: string;
}

export interface GscSelectPropertyResult {
  property: string;
  status: string;
}

export interface GscSyncPayload {
  /** YYYY-MM-DD */
  start_date?: string;
  end_date?: string;
}

export interface GscSyncResult {
  start_date: string;
  end_date: string;
  rows_received: number;
  rows_processed: number;
}

export interface GscOverview {
  connection: GscConnection | null;
  /** SQL aggregates: strings or numbers depending on the DB driver. */
  analytics: {
    total_clicks: number | string | null;
    total_impressions: number | string | null;
    ctr: number | string | null;
    average_position: number | string | null;
  };
  queries: GscQuery[];
}

// ── SERP research ────────────────────────────────────────────────────────

export interface SerpResearchRun {
  id: number;
  site_id: number;
  provider: string;
  status: string;
  keywords_requested: number;
  keywords_processed: number;
  results_found: number;
  started_at: DateTime | null;
  completed_at: DateTime | null;
  error_message: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface SerpResult {
  id: number;
  site_id: number;
  serp_research_run_id: number;
  keyword_id: number | null;
  keyword: string;
  position: number;
  title: string | null;
  url: string;
  domain: string;
  snippet: string | null;
  is_target_site: boolean;
  result_type: string | null;
  metadata: JsonObject | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface SerpResearchPayload {
  /** Defaults to the top keywords when empty */
  keyword_ids?: number[];
  /** 1–100, default 50 */
  limit?: number;
  /** Manual SERP rows (only used by the `manual` provider) */
  results?: JsonObject[];
}

export interface SerpResearchResult {
  run: SerpResearchRun;
  provider: string;
  keywords_processed: number;
  results_found: number;
  competitors: number;
  content_gaps: number;
}

export interface Competitor {
  id: number;
  site_id: number;
  domain: string;
  name: string | null;
  url: string | null;
  keywords_ranked_for: number;
  top_3_count: number;
  top_10_count: number;
  visibility_score: Decimal;
  content_gap_score: Decimal;
  top_keywords: unknown[] | null;
  metadata: JsonObject | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface ContentGap {
  id: number;
  site_id: number;
  keyword_id: number | null;
  keyword: string;
  gap_type: string;
  reason: string | null;
  competitor_count: number;
  opportunity_score: Decimal;
  competitors: unknown[] | null;
  metadata: JsonObject | null;
  status: string;
  created_at: DateTime;
  updated_at: DateTime;
}

// ── AI visibility ────────────────────────────────────────────────────────

export interface AiVisibilityPrompt {
  id: number;
  site_id: number;
  keyword_id: number | null;
  prompt: string;
  prompt_type: string | null;
  language: string | null;
  active: boolean;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface AiVisibilityPromptWithKeyword extends AiVisibilityPrompt {
  keyword: KeywordModel | null;
}

export interface AiVisibilityRun {
  id: number;
  site_id: number;
  status: string;
  prompts_requested: number;
  prompts_processed: number;
  started_at: DateTime | null;
  completed_at: DateTime | null;
  error_message: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface AiVisibilityResult {
  id: number;
  site_id: number;
  ai_visibility_run_id: number;
  ai_visibility_prompt_id: number;
  provider: string;
  /** e.g. openai/gpt-4o-mini */
  model: string | null;
  response_text: string | null;
  business_mentioned: boolean;
  mention_position: number | null;
  visibility_score: Decimal;
  competitors_mentioned_count: number;
  competitors_mentioned: unknown[] | null;
  citations: unknown[] | null;
  metadata: JsonObject | null;
  tested_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface AiVisibilityResultWithPrompt extends AiVisibilityResult {
  prompt: AiVisibilityPrompt | null;
}

export interface GeneratePromptsPayload {
  /** 1–100, default 25 */
  limit?: number;
}

export interface GeneratePromptsResult {
  keywords_processed: number;
  prompts_created: number;
  prompts_total: number;
}

export type AiTestProvider = "manual" | "openrouter";

export interface AiTestPayload {
  /** Omit to test the latest active prompts (up to `limit`) */
  prompt_ids?: number[] | null;
  limit?: number;
  provider?: AiTestProvider;
  /** e.g. openai/gpt-4o-mini */
  model?: string | null;
}

export interface AiTestResult {
  run: AiVisibilityRun;
  provider: string;
  model: string;
  prompts_processed: number;
}

export interface AiVisibilityStats {
  total_tests: number;
  mentioned: number;
  /** Percent */
  mention_rate: number;
  visibility_score: number;
}

export interface AiVisibilityOverview extends AiVisibilityStats {
  providers: (Omit<AiVisibilityStats, "total_tests"> & { provider: string; tests: number })[];
}

// ── SEO opportunities ────────────────────────────────────────────────────

export type SeoOpportunityStatus = "open" | "in_progress" | "completed" | "ignored";

export interface SeoOpportunity {
  id: number;
  site_id: number;
  keyword_id: number | null;
  crawl_page_id: number | null;
  type: string;
  status: SeoOpportunityStatus;
  priority: Priority;
  impact_score: Decimal;
  effort_score: Decimal;
  opportunity_score: Decimal;
  title: string;
  description: string | null;
  recommended_action: string | null;
  evidence: JsonObject | null;
  metadata: JsonObject | null;
  detected_at: DateTime | null;
  resolved_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface AnalyzeOpportunitiesResult {
  site_id: number;
  opportunities_created: number;
  summary: PrioritySummary;
}

// ── Content planner ──────────────────────────────────────────────────────

export type ContentCadence = "daily" | "weekly" | "custom";

export interface ContentPlan {
  id: number;
  site_id: number;
  name: string;
  period_start: DateTime;
  period_end: DateTime;
  timezone: string | null;
  articles_target: number | null;
  articles_planned: number | null;
  cadence: ContentCadence | string | null;
  default_publish_time: string | null;
  publishing_days: number[] | null;
  quiet_days: string[] | null;
  autopilot_enabled: boolean;
  status: string;
  settings: JsonObject | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface ContentCalendarItem {
  id: number;
  content_plan_id: number;
  site_id: number;
  keyword_id: number | null;
  opportunity_id: number | null;
  title: string;
  keyword: string | null;
  cluster_name: string | null;
  scheduled_date: DateTime;
  scheduled_time: string | null;
  timezone: string | null;
  /** e.g. planned; `removed` after the /remove endpoint */
  status: string;
  position: number | null;
  priority_score: Decimal;
  article_type: string | null;
  notes: string | null;
  metadata: JsonObject | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface ContentPlanWithItems extends ContentPlan {
  items: ContentCalendarItem[];
}

export interface GenerateContentPlanPayload {
  /** YYYY-MM */
  month: string;
  timezone?: string;
  articles_target?: number;
  cadence?: ContentCadence;
  /** ISO weekdays, 1 = Monday … 7 = Sunday */
  publishing_days?: number[];
  /** YYYY-MM-DD */
  quiet_days?: string[];
  /** HH:MM */
  publish_time?: string;
  autopilot_enabled?: boolean;
}

export interface GenerateContentPlanResult {
  plan: ContentPlan;
  items_created: number;
}

export interface ContentCalendarParams extends PageParams {
  /** YYYY-MM-DD */
  from?: string;
  to?: string;
}

export interface ReschedulePayload {
  /** YYYY-MM-DD */
  scheduled_date: string;
  /** HH:MM */
  scheduled_time?: string | null;
}

// ── Article research ─────────────────────────────────────────────────────

export interface ArticleResearch {
  id: number;
  workspace_id: number;
  site_id: number;
  keyword_id: number;
  crawl_page_id: number | null;
  status: string;
  search_intent: string | null;
  article_type: string | null;
  target_word_count: number | null;
  serp_summary: JsonObject | null;
  competitor_pages: unknown[] | null;
  competitor_headings: unknown[] | null;
  related_questions: unknown[] | null;
  related_searches: unknown[] | null;
  recommended_headings: unknown[] | null;
  recommended_topics: unknown[] | null;
  entities: unknown[] | null;
  internal_link_opportunities: unknown[] | null;
  external_citation_opportunities: unknown[] | null;
  content_gaps: unknown[] | null;
  brand_voice: JsonObject | null;
  research_summary: string | null;
  research_prompt: string | null;
  metadata: JsonObject | null;
  started_at: DateTime | null;
  completed_at: DateTime | null;
  error_message: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface ArticleResearchWithRelations extends ArticleResearch {
  keyword: KeywordModel;
  crawl_page: CrawlPageModel | null;
  article: Article | null;
}

export interface ResearchListParams extends PerPageParams {
  status?: string;
  keyword_id?: number;
}

// ── Articles ─────────────────────────────────────────────────────────────

/** e.g. generating, draft, publishing, published, failed */
export type ArticleStatus = "generating" | "draft" | "publishing" | "published" | "failed" | (string & {});

export interface Article {
  id: number;
  site_id: number;
  workspace_id: number;
  keyword_id: number | null;
  crawl_page_id: number | null;
  article_research_id: number | null;
  status: ArticleStatus;
  article_type: string | null;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  /** HTML */
  content: string;
  language: string | null;
  target_word_count: number | null;
  word_count: number | null;
  headings: unknown[] | null;
  internal_links: unknown[] | null;
  external_links: unknown[] | null;
  citations: unknown[] | null;
  entities: unknown[] | null;
  media: unknown[] | null;
  seo_analysis: JsonObject | null;
  metadata: JsonObject | null;
  generated_at: DateTime | null;
  published_at: DateTime | null;
  last_refreshed_at: DateTime | null;
  error_message: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface ArticleRevision {
  id: number;
  article_id: number;
  workspace_id: number;
  version: number;
  source: string;
  status: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  content: string;
  seo_analysis: JsonObject | null;
  metadata: JsonObject | null;
  created_by: number | null;
  created_at: DateTime;
  updated_at: DateTime;
}

/** Which relations are present depends on the endpoint (show/generate add revisions). */
export interface ArticleWithRelations extends Article {
  keyword?: KeywordModel | null;
  crawl_page?: CrawlPageModel | null;
  research?: ArticleResearch | null;
  revisions?: ArticleRevision[];
}

export interface ArticleListParams extends PerPageParams {
  status?: string;
  keyword_id?: number;
}

/** Send at least one field. Published/publishing articles cannot be edited. */
export interface UpdateArticlePayload {
  title?: string;
  slug?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  /** HTML */
  content?: string;
}

// ── Publishing ───────────────────────────────────────────────────────────

export type PublishingPlatform =
  "wordpress" | "wordpress_com" | "wix" | "shopify" | "webflow" | "ghost" | "duda" | "nextjs" | "custom";
export type PublishingMethod = "api" | "webhook" | "manual";
export type PublishingConnectionStatus = "pending" | "active" | "error";

/** `credentials` are never serialised. */
export interface PublishingConnection {
  id: number;
  workspace_id: number;
  site_id: number;
  name: string;
  platform: PublishingPlatform | string;
  method: PublishingMethod;
  status: PublishingConnectionStatus;
  config: JsonObject | null;
  last_tested_at: DateTime | null;
  last_error: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

/**
 * Required keys when `method = api`:
 * wordpress: credentials.site_url, username, application_password ·
 * shopify: credentials.store_domain, access_token ·
 * webflow: credentials.access_token, config.collection_id ·
 * wix: credentials.access_token, site_id ·
 * ghost: credentials.admin_api_key, config.site_url ·
 * wordpress_com: not allowed, use the OAuth flow.
 */
export interface CreatePublishingConnectionPayload {
  name: string;
  platform: PublishingPlatform;
  method: PublishingMethod;
  credentials?: {
    site_url?: string;
    username?: string;
    application_password?: string;
    store_domain?: string;
    access_token?: string;
    site_id?: string;
    admin_api_key?: string;
  } | null;
  config?: {
    collection_id?: string;
    site_url?: string;
    blog_id?: string;
    author_name?: string;
    field_mapping?: { title?: string; content?: string; slug?: string; meta_description?: string };
  } | null;
}

/** `POST /connections/{id}/test` → `data`. Check `success`: a 200 can still be a rejection. */
export interface PublishingTestResult {
  success: boolean;
  provider: string;
  message: string;
  site_url?: string;
  username?: string | null;
  [key: string]: unknown;
}

export interface Publication {
  id: number;
  workspace_id: number;
  site_id: number;
  article_id: number;
  publishing_connection_id: number;
  /** e.g. published, ready_for_manual_publish, failed */
  status: string;
  action: string | null;
  external_id: string | null;
  published_url: string | null;
  external_status: string | null;
  attempts: number | null;
  request_payload: JsonObject | null;
  response_metadata: JsonObject | null;
  error_message: string | null;
  scheduled_at: DateTime | null;
  published_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface PublicationWithRelations extends Publication {
  article: Article;
  connection: PublishingConnection;
}

export interface PublishArticlePayload {
  connection_id: number;
  /** Provider-specific, e.g. `{ status: "draft" | "publish" }` */
  options?: JsonObject;
}

/** Note: no `data` wrapper. */
export interface WordpressComAuthorizeResponse {
  success: true;
  authorization_url: string;
  expires_in: number;
}

export interface WordpressComSite {
  id: string;
  name: string;
  url: string;
}

/** `GET /publishing/wordpress-com/callback` (no `data` wrapper). */
export interface WordpressComCallbackResponse {
  success: true;
  message: string;
  pending_key: string;
  sites: WordpressComSite[];
  expires_in: number;
}

export interface WordpressComCompletePayload {
  pending_key: string;
  wordpress_site_id: string;
  name?: string | null;
}

// ── Site Guard ───────────────────────────────────────────────────────────

export type SiteGuardIssueStatus = "open" | "in_progress" | "resolved" | "ignored";

export interface SiteGuardIssue {
  id: number;
  workspace_id: number;
  site_id: number;
  crawl_page_id: number | null;
  /** e.g. missing_meta_description */
  type: string;
  status: SiteGuardIssueStatus;
  priority: Priority | string;
  impact_score: number;
  effort_score: number;
  opportunity_score: Decimal;
  title: string;
  description: string | null;
  recommended_action: string | null;
  current_value: string | null;
  recommended_value: string | null;
  evidence: JsonObject | null;
  /** `metadata.fix` holds the current proposal and its verification */
  metadata: JsonObject | null;
  detected_at: DateTime | null;
  resolved_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface SiteGuardIssueWithPage extends SiteGuardIssue {
  crawl_page: CrawlPageModel | null;
}

export interface SiteGuardIssueParams extends PageParams {
  status?: SiteGuardIssueStatus;
  priority?: string;
  type?: string;
}

/** `GET /site-guard/issues` adds the filters it applied (an empty object comes back as `[]`). */
export interface SiteGuardIssuesResponse extends ApiSuccess<LaravelPaginator<SiteGuardIssueWithPage>> {
  filters_applied: Record<string, string> | [];
}

export interface SiteGuardAnalyzeResult {
  issues_created: number;
  issues: SiteGuardIssue[];
}

export type FixField = "canonical" | "meta_description";

export interface FixProposal {
  success: boolean;
  issue_id: number;
  field: FixField;
  proposed_value: string;
  /** Only for canonical fixes */
  canonical_url?: string;
  /** Only for meta_description fixes */
  character_count?: number;
  status: string;
  /** Only for canonical fixes */
  instructions?: string[];
  message: string;
}

export interface FixDeploymentPackage {
  issue_id: number;
  status: string;
  mode: string;
  deployed: boolean;
  page_url: string;
  field: FixField;
  proposed_value: string;
  character_count: number | null;
  instructions: string[];
  implementation_examples: Record<string, string>;
  message: string;
}

export interface FixVerification {
  issue_id: number;
  verified: boolean;
  status: string;
  /** e.g. verified, mismatch, verification_unavailable */
  verification_status: string;
  verification_method: string;
  rendered_attempted: boolean;
  expected_value: string | null;
  raw_live_value: string | null;
  live_value: string | null;
  diagnostic: JsonObject | null;
  message: string;
}

// ── Money pages ──────────────────────────────────────────────────────────

export interface MoneyPage {
  id: number;
  workspace_id: number;
  site_id: number;
  crawl_page_id: number;
  status: string | null;
  commercial_score: Decimal;
  intent: string | null;
  page_role: string | null;
  name: string | null;
  primary_keyword_id: number | null;
  conversion_signals: unknown[] | null;
  keyword_ids: number[] | null;
  supporting_content: unknown[] | null;
  internal_link_opportunities: unknown[] | null;
  evidence: JsonObject | null;
  metadata: JsonObject | null;
  last_analyzed_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface MoneyPageWithRelations extends MoneyPage {
  crawl_page: CrawlPageModel | null;
  primary_keyword: KeywordModel | null;
}

export interface MoneyPageParams extends PerPageParams {
  status?: string;
  page_role?: string;
  intent?: string;
}

export interface MoneyPagesAnalyzeResult {
  site_id: number;
  money_pages_found: number;
  money_pages: MoneyPage[];
}

export interface RecommendationSummary {
  total_recommendations: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Recommendation {
  type: string;
  priority: Priority;
  title: string;
  description: string;
  recommended_action: string;
  action: string;
  data: JsonObject;
  [key: string]: unknown;
}

/** Returned without the `success` / `data` envelope. */
export interface MoneyPageRecommendations {
  money_page: {
    id: number;
    site_id: number;
    crawl_page_id: number;
    name: string;
    page_role: string;
    intent: string;
    commercial_score: Decimal;
    url: string | null;
    primary_keyword: string | null;
  };
  summary: RecommendationSummary;
  workflow: string[];
  recommendations: Recommendation[];
}

// ── Authority ────────────────────────────────────────────────────────────

export type BacklinkStatus = "open" | "researching" | "prospect" | "outreach" | "acquired" | "rejected";

export interface AuthorityProfile {
  id: number;
  workspace_id: number;
  site_id: number;
  authority_readiness_score: Decimal;
  internal_authority_score: Decimal;
  external_backlink_count: number | null;
  referring_domains: number | null;
  external_authority_score: Decimal | null;
  competitor_authority_gap_score: Decimal | null;
  provider: string | null;
  evidence: JsonObject | null;
  metadata: JsonObject | null;
  last_analyzed_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface BacklinkOpportunity {
  id: number;
  workspace_id: number;
  site_id: number;
  competitor_id: number | null;
  crawl_page_id: number | null;
  money_page_id: number | null;
  keyword_id: number | null;
  type: string;
  status: BacklinkStatus;
  priority: "high" | "medium" | "low";
  opportunity_score: Decimal;
  title: string;
  description: string | null;
  recommended_action: string | null;
  target_url: string | null;
  source_url: string | null;
  anchor_suggestion: string | null;
  evidence: JsonObject | null;
  metadata: JsonObject | null;
  detected_at: DateTime | null;
  completed_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface BacklinkOpportunityWithRelations extends BacklinkOpportunity {
  competitor: Competitor | null;
  crawl_page: CrawlPageModel | null;
  money_page: MoneyPage | null;
  keyword: KeywordModel | null;
}

/** Returned without the `success` / `data` envelope. */
export interface AuthorityAnalyzeResponse {
  site_id: number;
  profile: AuthorityProfile;
  summary: {
    opportunities: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    external_metrics_available: boolean;
  };
  workflow: string[];
  opportunities: BacklinkOpportunity[];
}

export interface UpdateBacklinkPayload {
  status?: BacklinkStatus;
  priority?: "high" | "medium" | "low";
  source_url?: string | null;
  anchor_suggestion?: string | null;
  metadata?: JsonObject;
}

/** Live backlink metrics from DataForSEO. Each call costs money. */
export interface BacklinkSummary {
  target: string;
  backlinks: number | null;
  referring_domains: number | null;
  referring_pages: number | null;
  rank: number | null;
  backlinks_spam_score: number | null;
  new_backlinks: number | null;
  lost_backlinks: number | null;
  provider: string;
  /** True when the backend uses the DataForSEO sandbox (fake data) */
  sandbox: boolean;
  api_cost_usd: number | null;
  retrieved_at: DateTime;
}

/** `GET /authority/backlinks/summary`, returned without an envelope. */
export interface BacklinkSummaryResponse {
  summary: BacklinkSummary;
  profile: AuthorityProfile;
}

export interface BacklinkItem {
  source_url: string | null;
  source_domain: string | null;
  source_title: string | null;
  source_status_code: number | null;
  target_url: string | null;
  anchor: string | null;
  dofollow: boolean | null;
  attributes: string[];
  backlink_rank: number | null;
  domain_rank: number | null;
  spam_score: number | null;
  first_seen: string | null;
  last_seen: string | null;
  is_lost: boolean;
  is_broken: boolean;
}

export interface BacklinkList {
  target: string;
  total_count: number | null;
  items_count: number;
  items: BacklinkItem[];
  provider: string;
  sandbox: boolean;
  api_cost_usd: number | null;
  retrieved_at: DateTime;
}

/** Paged with `limit` (1–100, default 20) and `offset` (0–20000). */
export interface BacklinkListParams {
  limit?: number;
  offset?: number;
}

export interface BacklinkProspectsPayload {
  /** Bare domain or URL */
  competitor_domain: string;
  /** Page on this site to pitch; defaults to the homepage */
  target_url?: string;
  /** 1–100, default 20 */
  limit?: number;
}

export interface BacklinkProspectsResponse {
  message: string;
  competitor_domain: string;
  target_url: string;
  processed: number;
  provider_total_count: number | null;
  sandbox: boolean;
  api_cost_usd: number | null;
}

// ── Copilot ──────────────────────────────────────────────────────────────

export interface CopilotConversation {
  id: number;
  workspace_id: number | null;
  site_id: number;
  user_id: number | null;
  title: string | null;
  status: string | null;
  provider: string | null;
  model: string | null;
  context: JsonObject | null;
  metadata: JsonObject | null;
  last_message_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface CopilotMessage {
  id: number;
  conversation_id: number;
  workspace_id: number | null;
  site_id: number;
  user_id: number | null;
  role: "user" | "assistant";
  content: string;
  context: JsonObject | null;
  actions: JsonObject[] | null;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  response_time_ms: number | null;
  metadata: JsonObject | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export interface CopilotAskPayload {
  /** 2–5000 characters */
  question: string;
  conversation_id?: number | null;
}

/** Returned without an envelope. */
export interface CopilotAskResponse {
  conversation: CopilotConversation;
  user_message: CopilotMessage;
  message: CopilotMessage;
  answer: string;
  actions: JsonObject[];
  focus: string | null;
  provider: string;
  model: string;
  usage: JsonObject;
}

export interface CopilotConversationListItem extends CopilotConversation {
  messages_count: number;
}

export interface CopilotConversationDetail extends CopilotConversation {
  messages: CopilotMessage[];
}

// ── MCP ──────────────────────────────────────────────────────────────────

export const MCP_TOOLS = [
  "analyze_keywords",
  "analyze_money_pages",
  "analyze_opportunities",
  "analyze_site_guard",
  "generate_content_plan",
  "get_ai_visibility",
  "get_articles",
  "get_authority",
  "get_competitors",
  "get_content_gaps",
  "get_content_plan",
  "get_keywords",
  "get_money_pages",
  "get_seo_opportunities",
  "get_site_guard",
  "get_site_overview",
  "test_ai_visibility",
] as const;
export type McpToolName = (typeof MCP_TOOLS)[number];

export interface McpTool {
  name: McpToolName;
  description: string;
  /** JSON Schema for `arguments` */
  inputSchema: JsonObject;
}

export interface McpToolsResponse {
  success: true;
  tools: McpTool[];
}

export interface McpCallPayload {
  tool: McpToolName;
  arguments?: JsonObject;
}

export interface McpCallResponse {
  success: true;
  tool: string;
  site_id: number;
  result: JsonObject;
}

// ── Free tools (public) ──────────────────────────────────────────────────

export interface RobotsTxtResult {
  /** false (with HTTP 200) when robots.txt could not be fetched */
  success: boolean;
  url: string;
  status_code: number;
  exists: boolean;
  message?: string;
  user_agent: string;
  size: number;
  rules: { user_agents: string[]; rules: { type: string; path: string }[] }[];
  sitemaps: string[];
  content: string;
}

export interface RedirectHop {
  url: string;
  status_code: number;
  status_text: string;
  redirect: boolean;
  location: string | null;
  duration_ms: number;
}

export interface RedirectCheckResult {
  success: boolean;
  url: string;
  final_url: string;
  status_code: number | null;
  status_text: string;
  redirected: boolean;
  redirect_count: number;
  redirect_loop: boolean;
  too_many_redirects: boolean;
  message?: string;
  chain: RedirectHop[];
}

export interface MetaTagsResult {
  success: boolean;
  url: string;
  final_url: string;
  status_code: number;
  status_text: string;
  message?: string;
  title: { value: string | null; present: boolean; length: number };
  description: { value: string | null; present: boolean; length: number };
  canonical: { value: string | null; present: boolean };
  robots: { value: string | null; indexable: boolean; followable: boolean };
  viewport: { value: string | null; present: boolean };
  headings: { h1_count: number; h1s: string[] };
  open_graph: Record<string, string | null>;
  twitter: Record<string, string | null>;
  html: { lang: string | null; charset: string | null };
  checks: Record<string, boolean>;
}

export interface BrokenLink {
  url: string;
  anchor_text: string;
  internal: boolean;
  status_code: number | null;
  status_text: string;
  broken: boolean;
  redirected: boolean;
  duration_ms: number;
  error: string | null;
}

export interface BrokenLinksResult {
  success: boolean;
  url: string;
  final_url: string;
  page_status_code: number;
  status_code?: number;
  message?: string;
  links_found: number;
  broken_links: number;
  working_links: number;
  internal_links: number;
  external_links: number;
  limit: number;
  links: BrokenLink[];
}

export interface KeywordClusteringResult {
  keywords_submitted: number;
  clusters_found: number;
  unclustered_keywords: number;
  clusters: { id: number; name: string; keywords: string[]; keyword_count: number }[];
}

export type SchemaType = "article" | "faq" | "local_business" | "organization" | "product" | "service";

export interface SchemaGeneratorPayload {
  type: SchemaType;
  data: {
    headline?: string;
    name?: string;
    description?: string;
    url?: string;
    image?: string;
    logo?: string;
    telephone?: string;
    author?: string;
    publisher?: string;
    brand?: string;
    provider?: string;
    questions?: { question: string; answer: string }[];
    same_as?: string[];
    address?: { street?: string; city?: string; region?: string; postal_code?: string; country?: string };
    geo?: { latitude: number; longitude: number };
    price?: number;
    currency?: string;
    availability?: string;
    sku?: string;
    service_type?: string;
    area_served?: string;
    price_range?: string;
    date_published?: string;
    date_modified?: string;
  };
}

export interface SchemaGeneratorResult {
  type: SchemaType;
  schema: JsonObject;
  /** Pretty-printed JSON for a `<script type="application/ld+json">` tag */
  json_ld: string;
}

// ═════════════════════════════════════════════════════════════════════════
// APP ENUMS
// Fixed values the UI is built around. Not data: the backend has no
// endpoint for these, and mock shapes live in src/lib/mocks/types.ts.
// ═════════════════════════════════════════════════════════════════════════

/** The AI assistants Rankoya reports on. The backend tests through OpenRouter models; see features/visibility/engines.ts. */
export type Engine = "chatgpt" | "gemini" | "perplexity" | "claude" | "aio";
export const engines = ["chatgpt", "gemini", "perplexity", "claude", "aio"] as const satisfies readonly Engine[];

export type Range = "7d" | "30d" | "90d" | "custom";
export const ranges = ["7d", "30d", "90d", "custom"] as const satisfies readonly Range[];

/** Workspace roles (`AllUserWorkspace.role`). */
export type Role = "owner" | "admin" | "member" | "viewer";
export type ThemePreference = "light" | "dark" | "system";

/** Site setup steps after the account step, in order. Progress is kept per site in the browser. */
export const SITE_SETUP_STEPS = [
  "details",
  "google-search-console",
  "core-topics",
  "billing",
  "integration",
  "preferences",
  "done",
] as const;
export type SiteSetupStep = (typeof SITE_SETUP_STEPS)[number];
