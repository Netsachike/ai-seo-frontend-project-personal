import api from "./api/api";
import {
  createEmailCampaignPayload,
  createEmailCampaignResponse,
  getEmailCampaignResponse,
} from "@/types/shared";

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

const emailMarketingService = {
  createEmailCampaign: async (
    payload: createEmailCampaignPayload,
  ): Promise<createEmailCampaignResponse> => {
    try {
      if (payload.type === "bulk_import" && payload.file) {
        const formData = new FormData();
        formData.append("name", payload.name);
        formData.append("subject", payload.subject);
        formData.append("type", payload.type);
        formData.append("content", payload.content);
        formData.append("file", payload.file);

        if (payload.recipient) {
          formData.append("recipient", payload.recipient);
        }

        if (payload.bulk_recipients && payload.bulk_recipients.length > 0) {
          payload.bulk_recipients.forEach((item, index) => {
            formData.append(`bulk_recipients[${index}]`, item);
          });
        }

        const response = await api.post<createEmailCampaignResponse>(
          "/user/sendCampaign",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        return response.data;
      }

      const response = await api.post<createEmailCampaignResponse>(
        "/user/sendCampaign",
        payload,
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to create email campaign: ${resolveErrorMessage(error)}`,
      );
    }
  },

  getEmailCampaigns: async (): Promise<getEmailCampaignResponse> => {
    try {
      const response = await api.get<getEmailCampaignResponse>(
        "/all/email/campaign",
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch email campaigns: ${resolveErrorMessage(error)}`,
      );
    }
  },
};

export default emailMarketingService;
