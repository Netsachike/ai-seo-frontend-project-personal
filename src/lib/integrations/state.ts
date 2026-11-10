import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { IntegrationError } from "./errors";

/**
 * Signed, short-lived OAuth state kept in an httpOnly cookie. Only the random
 * `nonce` travels through the provider; the site and the return path stay in
 * the cookie, signed so they can't be edited. Server only.
 */
export type OAuthState = {
  provider: string;
  siteId: string;
  returnTo: string;
  nonce: string;
  /** Epoch ms. */
  exp: number;
};

const STATE_TTL_MS = 10 * 60_000;

export const stateCookieName = (provider: string) => `rk_oauth_${provider}`;

/** Cookie options for the state cookie; the provider redirect is a top-level GET, so `lax` is enough. */
export const stateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/integrations",
  maxAge: STATE_TTL_MS / 1000,
};

function secret(): string {
  const value = process.env.INTEGRATIONS_STATE_SECRET;
  if (!value || value.length < 32) throw new IntegrationError("state_secret_missing", 500);
  return value;
}

const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function createState(input: Omit<OAuthState, "nonce" | "exp">) {
  const state: OAuthState = { ...input, nonce: randomBytes(16).toString("base64url"), exp: Date.now() + STATE_TTL_MS };
  const body = Buffer.from(JSON.stringify(state)).toString("base64url");
  return { state, cookie: `${body}.${sign(body)}` };
}

/** Checks the signature, the expiry and that the provider echoed back our nonce. */
export function readState(cookie: string | undefined, returnedNonce: string | null): OAuthState {
  const [body, sig] = (cookie ?? "").split(".");
  if (!body || !sig) throw new IntegrationError("missing_state", 400);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new IntegrationError("bad_state", 400);
  let state: OAuthState;
  try {
    state = JSON.parse(Buffer.from(body, "base64url").toString()) as OAuthState;
  } catch {
    throw new IntegrationError("bad_state", 400);
  }
  if (state.exp < Date.now() || !returnedNonce || state.nonce !== returnedNonce) {
    throw new IntegrationError("bad_state", 400);
  }
  return state;
}
