import { AxiosError } from "axios";

import { readLoginWorkspaces } from "@/lib/auth-session";
import api from "./api/api";
import {
  ActivateWorkspacePayload,
  ActivateWorkspaceResponse,
  CreateWorkspacePayload,
  createWorkspaceResponse,
  DeleteWorkspacePayload,
  DeleteWorkspaceResponse,
  GetAllWorkspacesResponse,
  UpdateWorkspacePayload,
  UpdateWorkspaceResponse,
} from "@/types/types";

const workspaceService = {
  createWorkspace: async (payload: CreateWorkspacePayload): Promise<createWorkspaceResponse> => {
    try {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("slug", payload.slug);
      formData.append("is_default", String(payload.is_default));

      if (payload.logo) {
        formData.append("logo", payload.logo);
      }

      const response = await api.post<createWorkspaceResponse>("/workspace/store", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  activateWorkspace: async (payload: ActivateWorkspacePayload): Promise<ActivateWorkspaceResponse> => {
    try {
      const response = await api.post<ActivateWorkspaceResponse>(`/workspaces/${payload.id}`);

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllWorkspaces: async (): Promise<GetAllWorkspacesResponse> => {
    try {
      const response = await api.get<GetAllWorkspacesResponse>("/workspace");
      return response.data;
    } catch (error) {
      // TEMPORARY: no workspace controller on the backend yet (404). Serve the
      // workspaces the login response carried. Remove once the endpoint is live.
      if (error instanceof AxiosError && error.response?.status === 404) {
        const login = readLoginWorkspaces();
        if (login) {
          const activeId = login.active_workspace?.id;
          return {
            status: "success",
            currentWorkspace: login.active_workspace ? [login.active_workspace] : [],
            userWorkspaces: login.all_user_workspaces.map((w) =>
              activeId === undefined ? w : { ...w, is_active: w.work_space_id === activeId ? 1 : 0 },
            ),
          };
        }
      }
      throw error;
    }
  },

  updateWorkspace: async (payload: UpdateWorkspacePayload): Promise<UpdateWorkspaceResponse> => {
    try {
      const response = await api.post<UpdateWorkspaceResponse>("/workspace/update", payload);

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteWorkspace: async (payload: DeleteWorkspacePayload): Promise<DeleteWorkspaceResponse> => {
    try {
      const response = await api.post<DeleteWorkspaceResponse>("/workspace/delete", payload);

      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default workspaceService;
