import api from "./api/api";
import { UserCreditsPayload, UserCreditsResponse } from "@/types/shared";

const creditsService = {
  addCreditsForUsers: async (
    payload: UserCreditsPayload,
  ): Promise<UserCreditsResponse> => {
    try {
      const response = await api.post<UserCreditsResponse>(
        "/admin/users/credits/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCreditForUsers: async (
    payload: UserCreditsPayload,
  ): Promise<UserCreditsResponse> => {
    try {
      const response = await api.post<UserCreditsResponse>(
        "/admin/users/credits/update",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default creditsService;
