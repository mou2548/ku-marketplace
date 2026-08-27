import { apiFetch } from "./client";

/**
 * The real backend's shape for a logged-in user — raw Prisma camelCase, and
 * only the four columns `auth.service.ts` actually selects. Deliberately not
 * merged into `lib/api/types.ts`'s `User` (snake_case, mirrors the PDF): that
 * type is the full row for the account screen, this is just what auth hands
 * back. Do not conflate the two.
 */
export interface AuthUser {
  userId: number;
  email: string;
  firstNameEn: string;
  isAdmin: boolean | null;
}

interface AuthResult {
  user: AuthUser;
  accessToken: string;
}

/** `POST /auth/register` — password required here, phone dropped (optional, nothing reads it later). */
export function requestRegisterOtp(email: string, password: string) {
  return apiFetch<{ email: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** `POST /auth/otp/resend` — reissues a code for a still-pending signup. */
export function resendOtp(email: string) {
  return apiFetch<{ email: string }>("/auth/otp/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** `POST /auth/otp/verify` — creates the account and opens the session. */
export function verifyRegisterOtp(email: string, otp: string) {
  return apiFetch<AuthResult>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

/** `POST /auth/login` */
export function login(email: string, password: string) {
  return apiFetch<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * `POST /auth/logout` — stateless: clears the backend's own refresh cookie.
 * No token blacklist exists, so this does not revoke an access token already
 * held elsewhere; it just expires on its own within 15 minutes.
 */
export function logout() {
  return apiFetch<Record<string, never>>("/auth/logout", { method: "POST" });
}

/**
 * `POST /auth/password/forgot` — always succeeds with the same message
 * whether or not the email is registered (anti-enumeration). Emails an OTP
 * only if it is.
 */
export function forgotPassword(email: string) {
  return apiFetch<{ email: string }>("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** `POST /auth/password/reset` — email + OTP, not a link token. */
export function resetPassword(email: string, otp: string, newPassword: string) {
  return apiFetch<{ email: string }>("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword }),
  });
}
