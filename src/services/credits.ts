import api from "./api/api";
import { UserCreditsPayload, UserCreditsResponse } from "@/types/types";

/**
 * AI token balances (admin). The backend calls the user `id`.
 * ⚠️ Both routes currently return 500 on the backend (TokenBillingService is missing).
 */
const creditsService = {
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
