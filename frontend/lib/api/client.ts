/**
 * Fetch wrapper for the real backend.
 *
 * The real response envelope is `{ statusCode, message, data: { data, meta? } }`
 * — not the `{ success, message, data }` shape `lib/api/types.ts` was written
 * against (that shape mirrors `API_Marketplace.pdf`, not the actual
 * `backend/main` implementation). Per CLAUDE.md §0, the frontend adapts to the
 * real backend, so this unwraps to `data.data` and every caller only ever sees
 * the payload.
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
  statusCode: number;
  message: string;
  data: { data: T; meta?: unknown };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Could not reach the server at ${API_URL}`, 0);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body && body.message
        ? String(body.message)
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return (body as Envelope<T>).data.data;
}
