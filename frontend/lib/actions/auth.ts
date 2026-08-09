"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface LoginState {
  error?: string;
}

/** One week. Long enough to survive a development session, short enough to expire. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * The development sign-in, checked against `ADMIN_USERNAME` / `ADMIN_PASSWORD`
 * in `.env.local`.
 *
 * TODO: replace with a real credential check against the API once auth exists.
 * Nothing reads this cookie yet — no route is guarded by it — so it marks that
 * someone signed in and nothing more.
 */
export async function login(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  // Fail closed. Without this an unset variable is `undefined`, and the only
  // thing stopping an empty form from matching it is a type mismatch.
  if (!expectedUsername || !expectedPassword) {
    return { error: "Sign-in is not configured on this server" };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // The identity is case-insensitive — an email address is, and a username
  // typed with an autocapitalised first letter on a phone should not fail.
  // The password is not.
  const ok =
    username.toLowerCase() === expectedUsername.trim().toLowerCase() &&
    password === expectedPassword;

  // One message for both halves: which field was wrong is not the user's
  // business to learn from the outside.
  if (!ok) {
    return { error: "Invalid username or password" };
  }

  const cookieStore = await cookies();
  cookieStore.set("session", "admin", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // The market feed, directly. This used to point at `/marketplace`, which only
  // exists as a permanent redirect to `/` — and browsers cache those.
  redirect("/");
}
