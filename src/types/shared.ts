/**
 * Shared Netsach backend types (workspaces, team, subscriptions, reseller,
 * admin, uploads), ported from the Flowcasta handoff. Field names match the
 * live API; do not rename them. Streaming, project and destination types are
 * Flowcasta-only and were left out.
 */

// GLOBAL USER RELATED TYPES

// workspaces
export interface Workspace {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  is_default: boolean;
  logo: null;
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
  platform: "jvz" | "paddle";
  type: "monthly" | "yearly" | "lifetime";
  start_date: string;
  end_date: string;
  // Renewal cancelled flag: 0 = renews, 1 = set to expire at end_date.
  is_cancelled?: number;
};

export type AddOns = {
  remove_branding?: {
    id: number;
    status: boolean;
    type: string;
    start_date: string;
    end_data: null;
  };
  reseller_seats?: {
    status: boolean;
    limit: number;
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
