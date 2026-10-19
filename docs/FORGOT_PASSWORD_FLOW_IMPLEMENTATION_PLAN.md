# Forgot / Reset Password Flow — Implementation Plan (for Rankoya)

Status: **shipped in Flowcasta**, written up so Rankoya can build the same flow.

The two apps share the backend contract for auth: the routes, payloads and response shapes below are the same. What differs is the front end around them (design system, toast helper, layout shell), so this plan spells out the contract precisely and gives the UI as a pattern to adapt, not as code to copy.

Flowcasta reference files:

| Concern | File |
| --- | --- |
| Types | `types/types.ts` (search `FORGOT / RESET PASSWORD TYPES`) |
| Service calls | `services/Auth.ts` (`forgotPassword`, `resetPassword`) |
| Axios client | `services/api/api.ts` |
| Request-link page | `app/(auth)/forgot-password/page.tsx` → `components/auth/ForgotPasswordView.tsx` |
| Set-new-password page | `app/(auth)/reset-password/page.tsx` → `components/auth/ResetPasswordView.tsx` |
| Route gating | `proxy.ts` (`PUBLIC_PATHS`, `AUTH_REDIRECT_PATHS`) |
| Entry point | `components/auth/LoginView.tsx` ("Forgot password?" link) |
| Error text | `lib/utils.ts` → `getErrorMessage()` |

---

## 1. The flow

```text
/login
  └ "Forgot password?" ──▶ /forgot-password
                              enter email
                              POST /password/forgot { email }
                              └ success ▸ "Check your inbox" (+ Resend)

                      Backend emails a link:
                      https://<rankoya-host>/reset-password?token=XXX&email=user@x.com
                                        │
                                        ▼
                           /reset-password?token&email
                              email shown read-only (from URL)
                              new password + confirm
                              POST /password/reset { email, token, password, password_confirmation }
                              └ success ▸ "Password reset!" ▸ "Continue to login" ──▶ /login
```

The user is never signed in during this flow. After a successful reset they log in normally; the reset endpoint does **not** return a session token.

---

## 2. API contract (shared)

Both endpoints are unauthenticated `POST`s, relative to the API base URL (`NEXT_PUBLIC_API_BASE_URL`).

### 2.1 `POST /password/forgot`

Sends the reset email.

```ts
// POST /password/forgot
export interface forgotPasswordPayload {
  email: string;
}

export interface forgotPasswordResponse {
  success: boolean;
  message: string; // "Reset link sent to your email"
}
```

### 2.2 `POST /password/reset`

Sets the new password using the token from the email link.

```ts
// POST /password/reset
export interface resetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface resetPasswordResponse {
  success: boolean;
  message: string; // "password reset successful"
}
```

Note the snake_case `password_confirmation` key: the backend validates it against `password`, so send it exactly as named.

### 2.3 Errors

Failures come back as non-2xx responses with the usual body (`{ success: false, message, errors? }`, where `errors` is `{ [field]: string[] }` on validation failures). Flowcasta does not branch on status codes here; it hands the axios error to `getErrorMessage(error, fallback)`, which pulls the best message out of `response.data` (message, then first field error) and falls back to the given string. Rankoya should reuse its equivalent helper rather than reading `error.response.data.message` by hand.

### 2.4 Reset link (backend → front end)

The email link points at the front end, not the API:

```
/reset-password?token=<token>&email=<email>
```

**Action for Rankoya:** confirm with the backend team that the link's host is configured per app, so Rankoya users land on Rankoya's `/reset-password`, not Flowcasta's. This is the one piece that is not automatically shared.

---

## 3. Implementation steps

### Step 1 — Types

Add the four interfaces from §2 to Rankoya's shared types file. Keep the names identical (`forgotPasswordPayload`, etc.) so the two codebases stay greppable against each other.

### Step 2 — Service methods

Add two methods to the auth service, using the existing axios instance (the one with the base URL and bearer interceptor; the interceptor is harmless here since there is no token yet):

```ts
// Sends the reset email. Backend emails a link to
// /reset-password?token=...&email=...
forgotPassword: async (
  payload: forgotPasswordPayload,
): Promise<forgotPasswordResponse> => {
  const res = await api.post<forgotPasswordResponse>("/password/forgot", payload);
  return res.data;
},

// Sets the new password using the token from the email link.
resetPassword: async (
  payload: resetPasswordPayload,
): Promise<resetPasswordResponse> => {
  const res = await api.post<resetPasswordResponse>("/password/reset", payload);
  return res.data;
},
```

### Step 3 — Routes

Create two pages inside the auth route group, each a thin server component that sets metadata and renders a client view:

- `app/(auth)/forgot-password/page.tsx`
- `app/(auth)/reset-password/page.tsx`

Set `robots: { index: false, follow: false }` in the metadata on both: these pages should not be indexed, and the reset URL carries a token.

> This is Next.js 16 — check `node_modules/next/dist/docs/` for the current `metadata` and route-group conventions before writing the pages.

### Step 4 — Forgot-password view (`/forgot-password`)

Client component, two states toggled by a `sent` boolean:

1. **Form state**
   - One email input (`type="email"`, `autoComplete="email"`).
   - On submit: guard against double submits (`if (isLoading) return`), trim the email, show a toast and stop if it is empty, then call `forgotPassword({ email })`.
   - On success, set `sent = true`. On error, toast `getErrorMessage(error, "Something went wrong. Please try again.")`.
   - Button shows a spinner + "Sending..." while loading and is disabled.
   - "Back to sign in" link to `/login`.

2. **Sent state**
   - "Check your inbox." + "We sent a reset link to {email}."
   - **Resend** button: calls the same endpoint with the same email and toasts "Reset link sent again." on success. It stays on this screen.
   - "Back to sign in" link.

Flowcasta animates between the two states with `framer-motion`'s `AnimatePresence mode="wait"`. That part is optional.

### Step 5 — Reset-password view (`/reset-password`)

Client component reading `token` and `email` from `useSearchParams()`.

- **Wrap the content in `<Suspense>`.** `useSearchParams()` in a client component needs a Suspense boundary or the build will complain. Flowcasta exports a `ResetPasswordView` that renders `<Suspense fallback={<spinner/>}><ResetPasswordContent/></Suspense>`.
- On mount, if `token` or `email` is missing, toast "Invalid or expired reset link. Please request a new one."
- Form fields:
  - Email: shown **read-only**, value from the URL (the user cannot change who they reset).
  - New password and confirm password, both `autoComplete="new-password"`, each with a show/hide eye toggle.
- Client-side checks before calling the API, in this order:
  1. Already loading: do nothing.
  2. Missing token/email: toast "Missing token or email. Please request a new link."
  3. Either password empty: toast "Please enter and confirm your new password."
  4. Passwords differ: toast "Passwords do not match."
- Call `resetPassword({ email, token, password, password_confirmation })`.
- On success: switch to the success state ("Password reset!", "You can now sign in with your new password.") with a "Continue to login" button doing `router.push("/login")`.
- On error: toast `getErrorMessage(error, "Failed to reset password. The link may have expired or is invalid.")`. Expired/used tokens and password-rule failures from the backend reach the user through this message.

Password strength rules come from the backend. Flowcasta does not duplicate them on the client, so the backend's validation message is the single source of truth. If Rankoya adds client-side rules, keep them in line with the backend's.

### Step 6 — Entry point on login

Add a "Forgot password?" link to `/forgot-password` under the password field on the login form (right-aligned in Flowcasta).

### Step 7 — Route gating (proxy / middleware)

In Flowcasta, `proxy.ts` lists both paths in two sets:

```ts
const PUBLIC_PATHS = new Set([
  "/login",
  // ...
  "/forgot-password",
  "/reset-password",
]);

const AUTH_REDIRECT_PATHS = new Set([
  "/login",
  // ...
  "/forgot-password",
  "/reset-password",
]);
```

- `PUBLIC_PATHS`: reachable without a session. Without this, the emailed link redirects a signed-out user to `/login` and the flow breaks.
- `AUTH_REDIRECT_PATHS`: a signed-in user who visits these pages is sent into the app.

Add both paths to Rankoya's equivalents. One consequence to know about: a user who is still signed in on that browser and clicks the email link is redirected away from `/reset-password`. That is how Flowcasta behaves today. If Rankoya wants signed-in users to be able to finish a reset, leave `/reset-password` out of the auth-redirect set.

---

## 4. Adapting to Rankoya

These are Flowcasta-specific and need swapping for Rankoya's own equivalents:

| Flowcasta | Swap for |
| --- | --- |
| `AuthShell`, `FullLogo` | Rankoya's auth card layout and logo |
| `Button`, `Input` (with `label`, `suffix` props), `Spinner` | Rankoya's UI primitives |
| `@/lib/toast` | Rankoya's toast helper |
| `getErrorMessage` from `@/lib/utils` | Rankoya's error extractor (or port this one) |
| CSS tokens such as `var(--brand)`, `text-display-lg` | Rankoya's design tokens |
| Placeholder `you@flowcasta.com`, metadata copy "Flowcasta account" | Rankoya branding |

The types, service methods, URL shape and validation order should stay exactly as described.

---

## 5. QA checklist

- [ ] "Forgot password?" on login opens `/forgot-password`.
- [ ] Empty email shows a toast and makes no request.
- [ ] Valid email shows the "Check your inbox" state; the email arrives.
- [ ] Resend sends a second email and stays on the sent screen.
- [ ] Email link opens **Rankoya's** `/reset-password?token=…&email=…` (not Flowcasta's).
- [ ] Signed-out user is not redirected to `/login` when opening the link.
- [ ] `/reset-password` with no query params shows the invalid-link toast.
- [ ] Email field is pre-filled and read-only.
- [ ] Mismatched passwords show a toast and make no request.
- [ ] A weak password shows the backend's validation message.
- [ ] Successful reset shows the success state; "Continue to login" goes to `/login`; the new password works and the old one does not.
- [ ] Reusing the same link a second time fails with a readable error.
- [ ] Double-clicking submit on either form sends only one request.
- [ ] Both pages are `noindex`.
