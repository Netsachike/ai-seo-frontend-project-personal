import api from "./api/api";
import {
  AddTeamMemberPayload,
  AddTeamMemberResponse,
  DeleteTeamMemberPayload,
  DeleteTeamMemberResponse,
  GetAllTeamMembersResponse,
  UpdateTeamMemberPasswordPayload,
  UpdateTeamMemberPasswordResponse,
  UpdateTeamMemberPayload,
  UpdateTeamMemberResponse,
} from "@/types/shared";

const teamMemberService = {
  addTeamMember: async (
    payload: AddTeamMemberPayload,
  ): Promise<AddTeamMemberResponse> => {
    try {
      const response = await api.post<AddTeamMemberResponse>(
        "/team/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllTeamMembers: async (): Promise<GetAllTeamMembersResponse> => {
    try {
      const response = await api.get<GetAllTeamMembersResponse>("/team");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeamMember: async (
    payload: UpdateTeamMemberPayload,
  ): Promise<UpdateTeamMemberResponse> => {
    try {
      const response = await api.post<UpdateTeamMemberResponse>(
        "/team/update",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeamMemberPassword: async (
    payload: UpdateTeamMemberPasswordPayload,
  ): Promise<UpdateTeamMemberPasswordResponse> => {
    try {
      const response = await api.post<UpdateTeamMemberPasswordResponse>(
        "/team/update/password",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteTeamMember: async (
    payload: DeleteTeamMemberPayload,
  ): Promise<DeleteTeamMemberResponse> => {
    try {
      const response = await api.delete<DeleteTeamMemberResponse>(
        "/team/delete",
        {
          data: payload,
        },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default teamMemberService;
