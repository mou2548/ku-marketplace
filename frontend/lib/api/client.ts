/**
 * The one place the frontend talks to the backend over HTTP.
 *
 * Two things every caller would otherwise re-derive live here: the response
 * envelope, and auth.
 *
 * Envelope — the backend wraps every successful body twice. A global
 * `ResponseInterceptor` produces `{ statusCode, message, data: { data } }`, and
 * each service method wraps its own payload again in `{ success, message, data }`
 * before that. So the value a caller actually wants sits at `body.data.data.data`.
 * `unwrap` peels those layers so functions return the payload directly. Paginated
 * bodies (`{ data, meta }`) are left one layer up so callers keep `meta`.
 *
 * Auth — mutating endpoints are behind `JwtAuthGuard`. On the client the bearer
 * token is read from `localStorage`; server components pass one explicitly since
 * they have no `localStorage`. Public reads (`GET /posts`, `GET /posts/:id`) work
 * with no token at all.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

/** Where the browser keeps the JWT after login. */
export const TOKEN_KEY = "access_token";

/** Thrown for any non-2xx response, carrying the backend's own message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  /** Explicit bearer token — required in server components, optional on client. */
  token?: string | null;
  /** Forwarded to `fetch`; Next.js reads `cache` / `next` from here. */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  signal?: AbortSignal;
}

function clientToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Strip the interceptor + service envelopes, keeping `{ data, meta }` intact. */
function unwrap(raw: unknown): unknown {
  let v = raw;
  // ResponseInterceptor: { statusCode, message, data }
  if (isObject(v) && "data" in v && "message" in v && "statusCode" in v) {
    v = v.data;
  }
  // Interceptor's inner { data } wrapper — but not a paginated { data, meta }.
  if (isObject(v) && "data" in v && !("meta" in v)) {
    v = v.data;
  }
  // Service's own ok(): { success, message, data }
  if (isObject(v) && "success" in v && "data" in v) {
    v = v.data;
  }
  return v;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

interface FetchInit extends RequestOptions {
  method?: string;
  body?: unknown;
}

export async function apiFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const { token, cache, next, signal, method = "GET", body } = init;
  const bearer = token ?? clientToken();

  const headers: Record<string, string> = {};
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
    signal,
  });

  const raw = await parseBody(res);

  if (!res.ok) {
    // Nest error filter emits { statusCode, message, error } at the top level.
    const message =
      (isObject(raw) && typeof raw.message === "string" && raw.message) ||
      (isObject(raw) && Array.isArray(raw.message) && raw.message.join(", ")) ||
      res.statusText ||
      "Request failed";
    throw new ApiError(res.status, message, raw);
  }

  return unwrap(raw) as T;
}
