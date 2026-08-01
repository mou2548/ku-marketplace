"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface LoginState {
  error?: string;
}

// TODO: replace with real credential check against the API once auth exists
export async function login(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const username = formData.get("username");
  const password = formData.get("password");

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return { error: "Invalid username or password" };
  }

  const cookieStore = await cookies();
  cookieStore.set("session", "admin", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/marketplace");
}
