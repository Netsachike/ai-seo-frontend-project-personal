import api from "./api/api";
import {
  CreateUserPayload,
  CreateUserResponse,
  getAdminDashboardResponse,
  UpdateUserPayload,
  UpdateUserResponse,
  UpdateUserSubscriptionsPayload,
  updateUserPasswordPayload,
  User,
  // new admin types
  AddNewUserFromAdminPayload,
  AddNewUserFromAdminResponse,
  UpdateNewUserFromAdminPayload,
  UpdateNewUserFromAdminResponse,
  UpdateAddonsPayload,
  UpdateAddonsResponse,
} from "@/types/shared";

const adminService = {
  getAllUsers: async (
    page?: number,
    search?: string,
  ): Promise<getAdminDashboardResponse["users"] | User[]> => {
    try {
      if (typeof page === "number") {
        const response = await api.get<getAdminDashboardResponse>("/admin", {
          params: {
            page,
            ...(search ? { search } : {}),
          },
        });

        return response.data.users;
      }

      const users: User[] = [];
      let currentPage = 1;
      let lastPage = 1;

      do {
        const response = await api.get<getAdminDashboardResponse>("/admin", {
          params: {
            page: currentPage,
            ...(search ? { search } : {}),
          },
        });

        const pageData = response.data.users;
        users.push(...(pageData?.data ?? []));
        lastPage = pageData?.last_page || currentPage;
        currentPage += 1;
      } while (currentPage <= lastPage);

      return users;
    } catch (error) {
      throw error;
    }
  },

  searchAllUsers: async (search: string): Promise<User[]> => {
    const users = await adminService.getAllUsers(undefined, search);
    return Array.isArray(users) ? users : users.data;
  },

  getAdminDashboardData: async (): Promise<getAdminDashboardResponse> => {
    try {
      const response = await api.get<getAdminDashboardResponse>("/admin");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createUser: async (
    payload: CreateUserPayload,
  ): Promise<CreateUserResponse> => {
    try {
      const response = await api.post<CreateUserResponse>(
        "/admin/users/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (
    payload: UpdateUserPayload,
  ): Promise<UpdateUserResponse> => {
    try {
      const response = await api.post<UpdateUserResponse>(
        "/admin/users/update/details",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteUser: async (
    user_id: number,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/admin/users/delete",
        { user_id },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  activateUser: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/activateUser",
        { id },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deactivateUser: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/deactivateUser",
        { id },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUserSubscriptions: async (
    payload: UpdateUserSubscriptionsPayload,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/admin/users/update/subscriptions",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUserPassword: async (
    payload: updateUserPasswordPayload,
  ): Promise<{ status: string; message: string }> => {
    try {
      const response = await api.post<{ status: string; message: string }>(
        "/admin/users/update/password",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // New Admin Add, Update User Functions
  addNewUserFromAdmin: async (
    payload: AddNewUserFromAdminPayload,
  ): Promise<AddNewUserFromAdminResponse> => {
    try {
      const response = await api.post<AddNewUserFromAdminResponse>(
        "/admin/users/add",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateNewUserFromAdmin: async (
    payload: UpdateNewUserFromAdminPayload,
  ): Promise<UpdateNewUserFromAdminResponse> => {
    try {
      const response = await api.post<UpdateNewUserFromAdminResponse>(
        "/admin/users/update/details",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateAddons: async (
    payload: UpdateAddonsPayload,
  ): Promise<UpdateAddonsResponse> => {
    try {
      const response = await api.post<UpdateAddonsResponse>(
        "/admin/addon/update",
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default adminService;
