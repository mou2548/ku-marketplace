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
import {
  REQUEST_PATH_HEADER,
  loginHref,
  requiresSignIn,
} from "./lib/auth-rules";

/** The path and query being requested, without the router's own `_rsc` key. */
function requestPath(request: NextRequest): string {
  const url = request.nextUrl.clone();
  url.searchParams.delete("_rsc");
  return `${url.pathname}${url.search}`;
}

/** Sends a signed-out visitor to sign in, remembering where they were going (audit F04). */
function toLogin(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(
    new URL(loginHref(requestPath(request)), request.url),
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** Continue, passing the requested path to layouts that may need to send it to login. */
function forward(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, requestPath(request));
  return NextResponse.next({ request: { headers } });
}

/** Renew near expiry before page rendering or a Server Action reads cookies.
 * Backend guards still perform all authorization. No mutation is replayed.
 *
 * A visitor with no session at all who asks for a signed-in area is sent to
 * login here, with `returnTo`, instead of by the page's own guard, which has no
 * way to know the path it was reached from.
 */
export async function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  // Page loads only: a Server Action POST must reach its own handler, which
  // reports the missing session as data instead of following a redirect.
  const guarded =
    (request.method === "GET" || request.method === "HEAD") &&
    requiresSignIn(request.nextUrl.pathname);
  if (!accessToken && !refreshToken && guarded) return toLogin(request);
  if (!refreshToken || tokenExpiresAt(accessToken) > Date.now() / 1000 + 60) {
    return forward(request);
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
    const response = forward(request);
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
    // The session has ended: a signed-in area goes to login, keeping the path.
    const response = guarded ? toLogin(request) : forward(request);
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
