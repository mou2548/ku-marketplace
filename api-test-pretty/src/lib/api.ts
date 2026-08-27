const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'ku_console_access_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export interface RawResult {
  status: number;
  ok: boolean;
  body: unknown;
  durationMs: number;
}

export async function rawRequest(
  method: string,
  path: string,
  body?: unknown,
  isFormData?: boolean,
  formData?: FormData,
): Promise<RawResult> {
  const token = getToken();
  const start = performance.now();

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? formData : body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const durationMs = Math.round(performance.now() - start);
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = await res.text().catch(() => null);
  }

  return { status: res.status, ok: res.ok, body: parsed, durationMs };
}

/** ดึงค่าตาม path เช่น "data.data.accessToken" จาก response body แบบปลอดภัย */
export function pluck(body: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, body);
}
