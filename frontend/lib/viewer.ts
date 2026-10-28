import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/session";
import { getMe, type Profile } from "@/lib/api/users";
import { REQUEST_PATH_HEADER, loginHref } from "@/lib/auth-rules";

/**
 * The signed-in viewer's profile, for a server page or layout that needs one.
 * No session cookie goes to login, back to the page that asked.
 *
 * Only an answer from the API decides that the session has ended (audit N01).
 * A 401 is a session that has ended; anything else (the API unreachable, a
 * 5xx) is thrown to the error boundary, because an outage says nothing about
 * who the viewer is and must not bounce a signed-in user to login.
 */
export async function requireViewer(): Promise<Profile> {
  const login = loginHref((await headers()).get(REQUEST_PATH_HEADER));
  if (!(await getAccessToken())) redirect(login);
  try {
    return await getMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(login);
    throw error;
  }
}
