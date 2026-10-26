import { NextRequest, NextResponse } from "next/server";
import { apiFetch, ApiError } from "./lib/api/client";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE_OPTIONS,
  tokenExpiresAt,
  accessCookieAge,
  type SessionTokens,
} from "./lib/session-cookies";

/** Renew near expiry before page rendering or a Server Action reads cookies.
 * Backend guards still perform all authorization. No mutation is replayed.
 */
export async function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!refreshToken || tokenExpiresAt(accessToken) > Date.now() / 1000 + 60) {
    return NextResponse.next();
  }
  try {
    const tokens = await apiFetch<SessionTokens>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    request.cookies.set(SESSION_COOKIE, tokens.accessToken);
    request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    response.cookies.set(SESSION_COOKIE, tokens.accessToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: accessCookieAge(tokens.accessToken),
    });
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      ...SESSION_COOKIE_OPTIONS,
      expires: new Date(tokens.sessionExpiresAt * 1000),
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      // Preserve credentials on transient errors. Do not run a mutation without
      // its session or retry it automatically when the service returns.
      return new NextResponse(
        "Session service is temporarily unavailable. Please retry.",
        {
          status: 503,
          headers: { "Cache-Control": "no-store", "Retry-After": "5" },
        },
      );
    }
    request.cookies.delete(SESSION_COOKIE);
    request.cookies.delete(REFRESH_COOKIE);
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
