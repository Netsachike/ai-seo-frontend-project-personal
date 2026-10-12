import api from "./api/api";
import { whiteLabelAccessPath } from "@/lib/white-label-access";
import type { AddonAccessResponse } from "@/types/types";

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  errors?: {
    [key: string]: string[];
  } | null;
}

const SubscriptionService = {
  /**
   * Cancels renewal of the user's current subscription. The user keeps access
   * until the period ends (Paddle stops the next billing cycle); this does not
   * refund or immediately revoke access. The backend talks to Paddle and
   * persists the cancelled state.
   */
  cancelSubscription: async (subscriptionId: string | number) => {
    try {
      const res = await api.post<CancelSubscriptionResponse>("/cancle/subscription", { subscriptionId });
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Whether this account owns the White Label (`reseller_seats`) add-on,
   * answered by the backend rather than inferred from the session cookie.
   *
   * Used as the second gate on the Marketing Assets CTA and page — the cookie
   * read decides what to render immediately, this decides whether it was
   * right. Throws on failure so callers can tell "no" apart from "couldn't
   * ask" and keep showing the optimistic state instead of locking someone out
   * over a dropped request.
   */
  getWhiteLabelAccess: async (userId: number | string): Promise<AddonAccessResponse> => {
    const response = await api.get<AddonAccessResponse>(whiteLabelAccessPath(userId));
    return response.data;
  },
};

export default SubscriptionService;
