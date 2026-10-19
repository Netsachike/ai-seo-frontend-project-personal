import api from "./api/api";

/** `status` envelope: `{ status: "success" | "error", message }`. */
type StatusResponse = { status: string; message: string };

/** The signed-in user's own name and password. */
const accountService = {
  /** `POST /user/update-name`. Returns the updated user. */
  updateName: async (payload: { first_name: string; last_name: string }) => {
    const response = await api.post<StatusResponse & { user?: unknown }>("/user/update-name", payload);
    return response.data;
  },

  /** `POST /user/update-password`. The current password isn't asked for, and existing sessions stay signed in. */
  updatePassword: async (payload: { password: string; password_confirmation: string }) => {
    const response = await api.post<StatusResponse>("/user/update-password", payload);
    return response.data;
  },
};

export default accountService;
