import { getAccessToken } from "@/lib/api/session";
import { getMe } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await getAccessToken()))
    return Response.json({ authenticated: false }, { status: 401, headers });
  try {
    await getMe();
    return Response.json({ authenticated: true }, { headers });
  } catch (error) {
    const status =
      error instanceof ApiError && error.status === 401 ? 401 : 503;
    return Response.json({ authenticated: false }, { status, headers });
  }
}
