import { cookies } from "next/headers";

/**
 * Holds the backend's `accessToken` — nothing else. The backend also sets a
 * `refreshToken` httpOnly cookie on login/verify, but there is no
 * `/auth/refresh` endpoint anywhere in the merged backend to spend it against
 * (confirmed by reading every controller), so it is never relayed or stored
 * here. The session simply expires when the access token does; there is no
 * silent-refresh path to build against an endpoint that doesn't exist.
 */
const SESSION_COOKIE = "session";

/** Matches the backend's real access token lifetime (`token.service.ts`). */
const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;

export async function setSession(accessToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

/** Spread into a fetch `headers` object for any `JwtAuthGuard` route. */
export async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
