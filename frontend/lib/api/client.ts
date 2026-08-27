/**
 * Fetch wrapper for the real backend.
 *
 * Envelope per `backend/src/common/interceptors/response.interceptor.ts` +
 * `http-exception.filter.ts`: `{ success: true, message, data }` on success,
 * `{ success: false, message, data: null }` on error. This matches
 * `lib/api/types.ts`'s `ApiResponse<T>` now — it did not always: the backend
 * briefly returned `{ statusCode, message, data: { data } }` before the
 * interceptor was rewritten to match the spec. If requests start failing to
 * parse again, check this file against the interceptor first.
 *
 * Server-only: every call site so far is a Server Action or a Server
 * Component, so the backend URL never needs to reach the browser bundle.
 */

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // `FormData` bodies (file uploads) must not get a hand-set `Content-Type` —
  // `fetch` writes its own with the multipart boundary. JSON bodies get the
  // default unless the caller already set one.
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (!(init?.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Could not reach the server at ${API_URL}`, 0);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    const message =
      body && typeof body === "object" && "message" in body && body.message
        ? String(body.message)
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return (body as Envelope<T>).data;
}
