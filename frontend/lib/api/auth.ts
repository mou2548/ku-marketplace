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

/** `POST /auth/register/request-otp` — password required here, phone dropped (optional, nothing reads it later). */
export function requestRegisterOtp(email: string, password: string) {
  return apiFetch<{ message: string }>("/auth/register/request-otp", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** `POST /auth/register/verify-otp` — creates the account and opens the session. */
export function verifyRegisterOtp(email: string, otp: string) {
  return apiFetch<AuthResult>("/auth/register/verify-otp", {
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
