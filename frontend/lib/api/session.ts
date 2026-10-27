import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE_OPTIONS,
  accessCookieAge,
  type SessionTokens,
} from "../session-cookies";

export async function setSession(
  accessToken: string,
  tokens: Omit<SessionTokens, "accessToken">,
) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, accessToken, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: accessCookieAge(accessToken),
  });
  cookieStore.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires: new Date(tokens.sessionExpiresAt * 1000),
  });
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
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

interface TokenPayload {
  userId?: number;
  email?: string;
  isAdmin?: boolean;
}

/**
 * Reads the access token's payload — no signature check, because none is
 * needed: this is our own token, just handed back to us by the backend, used
 * only for client-side conveniences (filtering "my items", gating an admin
 * nav link). Every real authorization decision is still made server-side
 * against the `Authorization` header itself (`items.service.ts` checks
 * `item.ownerId !== userId`, `AdminGuard` checks `request.user.isAdmin`), so a
 * forged or stale value here can't do anything, only show the wrong thing.
 */
async function decodeToken(): Promise<TokenPayload | undefined> {
  const token = await getAccessToken();
  if (!token) return undefined;

  const payload = token.split(".")[1];
  if (!payload) return undefined;

  try {
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json) as TokenPayload;
  } catch {
    return undefined;
  }
}

export async function getCurrentUserId(): Promise<number | undefined> {
  return (await decodeToken())?.userId;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  return (await decodeToken())?.isAdmin === true;
}
