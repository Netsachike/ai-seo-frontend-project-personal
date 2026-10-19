import api from "./api/api";
import type {
  ApiSuccess,
  forgotPasswordPayload,
  forgotPasswordResponse,
  LoginData,
  LoginPayload,
  RegisterPayload,
  resetPasswordPayload,
  resetPasswordResponse,
  UserResource,
} from "@/types/types";

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

  /** Emails a link to `/reset-password?token=…&email=…` on this app. */
  forgotPassword: async (payload: forgotPasswordPayload) => {
    const response = await api.post<forgotPasswordResponse>("/password/forgot", payload);
    return response.data;
  },

  /** Sets the new password with the emailed token. Returns no session: the user signs in afterwards. */
  resetPassword: async (payload: resetPasswordPayload) => {
    const response = await api.post<resetPasswordResponse>("/password/reset", payload);
    return response.data;
  },

  /** Marks the onboarding tours as done, so other browsers don't start them again. Shared with Flowcasta. */
  markTourCompleted: async () => {
    const response = await api.patch<ApiSuccess<null>>("/user/tour-completed", { tour_completed: true });
    return response.data;
  },

  me: async () => {
    const response = await api.get<ApiSuccess<UserResource>>("/me");
    return response.data;
  },
};

export default authService;
