/** Shared by Server Actions and Proxy. JWT decoding here is only a refresh hint. */
export const SESSION_COOKIE = "session";
export const REFRESH_COOKIE = "ku-refresh";
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  sessionExpiresAt: number;
}

export function tokenExpiresAt(token: string | undefined): number {
  if (!token) return 0;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp
      : 0;
  } catch {
    return 0;
  }
}

export function accessCookieAge(token: string): number {
  return Math.max(0, tokenExpiresAt(token) - Math.floor(Date.now() / 1000));
}
