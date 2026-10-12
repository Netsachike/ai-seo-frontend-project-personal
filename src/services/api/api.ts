import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import { clearSession, getAuthTokenCookie } from "@/lib/auth-session";

/**
 * The Rankoya backend (Laravel, Sanctum tokens). `NEXT_PUBLIC_API_BASE_URL`
 * includes the `/api` prefix, e.g. `https://api.rankoya.uk/api`. Without it
 * there is no backend to sign in to, so the app stays signed out.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const isApiConfigured = Boolean(API_BASE_URL);

/** Synchronous LLM, SERP and AI-visibility calls can take minutes. */
export const LONG_REQUEST_TIMEOUT_MS = 5 * 60_000;

const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 60_000,
  headers: {
    // Without it Laravel answers errors with HTML redirects instead of JSON.
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!isApiConfigured) {
      return Promise.reject(new AxiosError("The API is not configured.", "ERR_API_NOT_CONFIGURED", config));
    }

    const token = typeof window !== "undefined" ? getAuthTokenCookie() : undefined;
    if (typeof token === "string") {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

/** Fired when the backend rejects the token, so the app can send the user to sign in. */
export const SESSION_EXPIRED_EVENT = "rankoya:session-expired";

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isAuthCall = error instanceof AxiosError && /\/(login|register)$/.test(error.config?.url ?? "");
    if (error instanceof AxiosError && error.response?.status === 401 && !isAuthCall) {
      clearSession();
      if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

export default api;
