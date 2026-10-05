"use server";

import { redirect } from "next/navigation";

import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearSession, getRefreshToken, setSession } from "@/lib/api/session";

function messageFor(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Could not reach the server. Try again.";
}

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
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
    return { error: messageFor(err) };
  }

  await setSession(accessToken, session);
  const requestedReturn = String(formData.get("returnTo") ?? "");
  const returnTo = /^\/sellers\/[1-9]\d{0,9}$/.test(requestedReturn) && Number(requestedReturn.split("/").pop()) <= 2147483647 ? requestedReturn : undefined;
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
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await authApi.requestRegisterOtp(email, password);
  } catch (err) {
    return { error: messageFor(err) };
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
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "");

  let accessToken: string;
  let session: { refreshToken: string; sessionExpiresAt: number };
  try {
    const result = await authApi.verifyRegisterOtp(email, otp);
    accessToken = result.accessToken;
    session = result;
  } catch (err) {
    return { error: messageFor(err) };
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
  const email = String(formData.get("email") ?? "").trim();

  try {
    await authApi.resendOtp(email);
  } catch (err) {
    return { error: messageFor(err) };
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
  const email = String(formData.get("email") ?? "").trim();

  try {
    await authApi.forgotPassword(email);
  } catch (err) {
    return { error: messageFor(err) };
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
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  try {
    await authApi.resetPassword(email, otp, newPassword);
  } catch (err) {
    return { error: messageFor(err) };
  }

  redirect("/login");
}
