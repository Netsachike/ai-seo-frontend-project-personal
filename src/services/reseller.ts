import api from "./api/api";
import {
  GetAllResellersResponse,
  AddResellerPayload,
  AddResellerResponse,
  UpdateResellerPayload,
  UpdateResellerResponse,
  UpdateResellerPasswordPayload,
  UpdateResellerPasswordResponse,
  DeleteResellerPayload,
  DeleteResellerResponse,
} from "@/types/types";

const resellerService = {
  getAllResellers: async (): Promise<GetAllResellersResponse> => {
    try {
      const response = await api.get<GetAllResellersResponse>("/reseller");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addReseller: async (payload: AddResellerPayload): Promise<AddResellerResponse> => {
    try {
      const response = await api.post<AddResellerResponse>("/reseller/add", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateReseller: async (payload: UpdateResellerPayload): Promise<UpdateResellerResponse> => {
    try {
      const response = await api.post<UpdateResellerResponse>("/reseller/update/details", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateResellerPassword: async (payload: UpdateResellerPasswordPayload): Promise<UpdateResellerPasswordResponse> => {
    try {
      const response = await api.post<UpdateResellerPasswordResponse>("/reseller/update/password", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteReseller: async (payload: DeleteResellerPayload): Promise<DeleteResellerResponse> => {
    try {
      const response = await api.delete<DeleteResellerResponse>("/reseller/delete", {
        data: payload,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default resellerService;
