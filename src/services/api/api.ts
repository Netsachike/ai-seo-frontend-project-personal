import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import { getAuthTokenCookie } from "@/lib/auth-session";
import { demoAdapter } from "./demo-adapter";

/**
 * The shared Netsach backend. Without NEXT_PUBLIC_API_BASE_URL the app runs in
 * demo mode: requests are answered in the browser by `demoAdapter`, so every
 * account page works on a preview deploy with no environment set.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export const isDemoApi = !BASE_URL;

const api = axios.create({
  baseURL: BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  ...(isDemoApi ? { adapter: demoAdapter } : {}),
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== "undefined" ? getAuthTokenCookie() : undefined;

    if (typeof token === "string") {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

export default api;
