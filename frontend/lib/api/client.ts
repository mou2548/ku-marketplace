/**
 * The one place the frontend talks to the backend over HTTP.
 *
 * Two things every caller would otherwise re-derive live here: the response
 * envelope, and auth.
 *
 * Envelope — the backend returns `{ success, message, data }`, with `meta`
 * alongside `data` for paginated lists. Legacy nested envelopes are supported
 * as well. Pagination metadata must survive unwrapping.
 *
 * Auth — mutating endpoints are behind `JwtAuthGuard`. Callers reach the bearer
 * token two ways, both supported here:
 *   - pass `token` explicitly (server components / actions read it from the
 *     session cookie via `session.ts`);
 *   - pass an `Authorization` header directly in `headers` (the older
 *     `authHeader()` helper style);
 *   - on the client, nothing is passed and the token is read from
 *     `localStorage`.
 * An `Authorization` header the caller set always wins over `token`.
 *
 * Body — a caller may hand `body` as a plain object (serialised here), a
 * pre-stringified JSON string, or a `FormData` (passed through untouched so
 * `fetch` writes its own multipart boundary).
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
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
  signal?: AbortSignal | null;
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
  if (isObject(v) && "success" in v && "data" in v && !("meta" in v)) {
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

/**
 * Superset of `fetch`'s init: everything `RequestInit` allows (so the older
 * `{ method, headers, body: JSON.stringify(...) }` call style still type-checks),
 * plus `token` and a widened `body` that also accepts a plain object.
 */
export interface FetchInit extends Omit<RequestInit, "body"> {
  /** Explicit bearer token; an `Authorization` header still wins over it. */
  token?: string | null;
  next?: { revalidate?: number | false; tags?: string[] };
  body?: unknown;
}

function isBinaryBody(body: unknown): body is BodyInit {
  return (
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
}

export async function apiFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const { token, method = "GET", body, headers: initHeaders, ...rest } = init;
  const bearer = token ?? clientToken();

  const headers = new Headers(initHeaders as HeadersInit | undefined);
  if (bearer && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${bearer}`);
  }

  let outBody: BodyInit | undefined;
  if (body === undefined || body === null) {
    outBody = undefined;
  } else if (typeof body === "string") {
    outBody = body;
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  } else if (isBinaryBody(body)) {
    // FormData &c. — let `fetch` set its own Content-Type (multipart boundary).
    outBody = body;
  } else {
    outBody = JSON.stringify(body);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    method,
    headers,
    body: outBody,
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
