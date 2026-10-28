"use server";

import { redirect } from "next/navigation";

import * as authApi from "@/lib/api/auth";
import { errorText } from "@/lib/api-errors";
import { normalizeEmail, safeReturnTo } from "@/lib/auth-rules";
import { clearSession, getRefreshToken, setSession } from "@/lib/api/session";

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your KU email and password" };
  }

  let accessToken: string;
  let session: { refreshToken: string; sessionExpiresAt: number };
  let restricted = false;
  let isAdmin = false;
  try {
    const result = await authApi.login(email, password);
    accessToken = result.accessToken;
    session = result;
    restricted =
      result.user.status === "Suspended" || result.user.status === "Banned";
    isAdmin = result.user.isAdmin === true;
  } catch (err) {
    return { error: errorText(err) };
  }

  await setSession(accessToken, session);
  // Any same-origin path; everything else falls back to the role's home.
  const returnTo = safeReturnTo(formData.get("returnTo"));
  redirect(
    restricted ? "/account/appeals" : returnTo ?? (isAdmin ? "/admin" : "/feed"),
  );
}

export interface RegisterState {
  error?: string;
}

/** Step 1 of signup: email + password only (see docs/design/api-gaps.md). */
export async function requestRegisterOtp(
  _prevState: RegisterState | undefined,
  formData: FormData,
): Promise<RegisterState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  try {
    await authApi.requestRegisterOtp(email, password);
  } catch (err) {
    return { error: errorText(err) };
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export interface VerifyState {
  error?: string;
}

/** Step 2: verifying opens the account and the session in one call. */
export async function verifyRegisterOtp(
  _prevState: VerifyState | undefined,
  formData: FormData,
): Promise<VerifyState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const otp = String(formData.get("otp") ?? "");

  let accessToken: string;
  let session: { refreshToken: string; sessionExpiresAt: number };
  try {
    const result = await authApi.verifyRegisterOtp(email, otp);
    accessToken = result.accessToken;
    session = result;
  } catch (err) {
    return { error: errorText(err) };
  }

  await setSession(accessToken, session);
  redirect("/feed");
}

export interface ResendState {
  error?: string;
  resent?: boolean;
}

/** Reissues the pending signup's OTP. 404s if it already expired (see `otp.service.ts`). */
export async function resendOtp(
  _prevState: ResendState | undefined,
  formData: FormData,
): Promise<ResendState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  try {
    await authApi.resendOtp(email);
  } catch (err) {
    return { error: errorText(err) };
  }

  return { resent: true };
}

/** Do not claim server-side revocation succeeded during a service outage. */
export async function logout() {
  await authApi.logout(await getRefreshToken());
  await clearSession();
  redirect("/login");
}

export interface ForgotPasswordState {
  error?: string;
}

/** Always "succeeds" (anti-enumeration) — an OTP is only actually sent if the email exists. */
export async function forgotPassword(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  try {
    await authApi.forgotPassword(email);
  } catch (err) {
    return { error: errorText(err) };
  }

  redirect(`/reset?email=${encodeURIComponent(email)}`);
}

export interface ResetPasswordState {
  error?: string;
}

export async function resetPassword(
  _prevState: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const otp = String(formData.get("otp") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  try {
    await authApi.resetPassword(email, otp, newPassword);
  } catch (err) {
    return { error: errorText(err) };
  }

  redirect("/login");
}
