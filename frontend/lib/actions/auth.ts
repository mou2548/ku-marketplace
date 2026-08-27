"use server";

import { redirect } from "next/navigation";

import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { setSession } from "@/lib/api/session";

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
  try {
    ({ accessToken } = await authApi.login(email, password));
  } catch (err) {
    return { error: messageFor(err) };
  }

  await setSession(accessToken);
  redirect("/");
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
  try {
    ({ accessToken } = await authApi.verifyRegisterOtp(email, otp));
  } catch (err) {
    return { error: messageFor(err) };
  }

  await setSession(accessToken);
  redirect("/");
}
