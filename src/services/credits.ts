import api from "./api/api";
import type { ApiSuccess, CreditBalance, UserCreditsPayload, UserCreditsResponse } from "@/types/types";

/**
 * API credits (the wallet paid DataForSEO calls spend) and the older AI token
 * balances (admin). The token routes call the user `id`.
 * ⚠️ Both token routes currently return 500 on the backend (TokenBillingService is missing).
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

  addCreditsForUsers: async (payload: UserCreditsPayload): Promise<UserCreditsResponse> => {
    try {
      const response = await api.post<UserCreditsResponse>("/user/add-tokens", {
        id: payload.user_id,
        amount: payload.amount,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCreditForUsers: async (payload: UserCreditsPayload): Promise<UserCreditsResponse> => {
    try {
      const response = await api.post<UserCreditsResponse>("/user/update-tokens", {
        id: payload.user_id,
        amount: payload.amount,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default creditsService;
