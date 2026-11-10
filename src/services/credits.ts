import api from "./api/api";
import type {
  AddApiCreditsPayload,
  AddApiCreditsResponse,
  ApiSuccess,
  CreditBalance,
  SetUserCreditsPayload,
  SetUserCreditsResponse,
} from "@/types/types";

/**
 * API credits: the wallet that paid DataForSEO calls spend (keyword discovery,
 * SERP research). Admins top it up with addApiCredits.
 */
const creditsService = {
  /**
   * The logged-in user's API credit wallet and their last 10 paid tasks.
   * Paid calls bill the workspace owner, so a team member sees their own
   * (usually empty) wallet, not the owner's.
   */
  getBalance: async (): Promise<CreditBalance> => {
    const response = await api.get<ApiSuccess<CreditBalance>>("/credits/balance");
    return response.data.data;
  },

  /**
   * Admin only (admin or support role): adds credits to a user's wallet,
   * creating it if needed, and records a `grant` in its history. Replaces the
   * old AI token routes (/user/add-tokens, /user/update-tokens), which 500.
   */
  addApiCredits: async (payload: AddApiCreditsPayload): Promise<AddApiCreditsResponse> => {
    const response = await api.post<AddApiCreditsResponse>("/admin/users/add-api-credits", payload);
    return response.data;
  },

  /**
   * Admin only: sets a user's available balance to an exact number (0 allowed),
   * recorded as an `adjustment`. Note the path has no `/admin` prefix.
   */
  setUserCredits: async (userId: number, payload: SetUserCreditsPayload): Promise<SetUserCreditsResponse> => {
    const response = await api.put<SetUserCreditsResponse>(`/users/${userId}/credits`, payload);
    return response.data;
  },
};

export default creditsService;
