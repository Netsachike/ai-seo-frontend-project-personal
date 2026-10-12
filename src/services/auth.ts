import api from "./api/api";
import type { ApiSuccess, LoginData, LoginPayload, RegisterPayload, UserResource } from "@/types/types";

/** Login, logout and the current user. Tokens are Sanctum personal access tokens. */
const authService = {
  /** `401` with `{ success: false, message }` on wrong credentials or an unverified email. */
  login: async (payload: LoginPayload) => {
    const response = await api.post<ApiSuccess<LoginData>>("/login", payload);
    return response.data;
  },

  /**
   * The backend route currently returns 500 (`AuthController::register` is
   * missing). Once fixed it returns the same shape as `/login`.
   */
  register: async (payload: RegisterPayload) => {
    const response = await api.post<ApiSuccess<LoginData>>("/register", payload);
    return response.data;
  },

  /** Revokes the current token. */
  logout: async () => {
    const response = await api.post<ApiSuccess<null>>("/logout");
    return response.data;
  },

  me: async () => {
    const response = await api.get<ApiSuccess<UserResource>>("/me");
    return response.data;
  },
};

export default authService;
