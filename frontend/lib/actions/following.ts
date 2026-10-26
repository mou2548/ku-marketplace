"use server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/session";

export async function setFollowing(
  sellerId: number,
  following: boolean,
): Promise<{ error?: "login" | "unavailable" | "failed" }> {
  if (
    !Number.isSafeInteger(sellerId) ||
    sellerId < 1 ||
    typeof following !== "boolean"
  )
    return { error: "failed" };
  const token = await getAccessToken();
  if (!token) return { error: "login" };
  try {
    await apiFetch(`/users/me/following/${sellerId}`, {
      token,
      method: following ? "PUT" : "DELETE",
    });
  } catch (error) {
    return {
      error:
        error instanceof ApiError && error.status === 401
          ? "login"
          : error instanceof ApiError && [403, 404].includes(error.status)
            ? "unavailable"
            : "failed",
    };
  }
  // Public counts and private state are no-store reads. The caller refreshes
  // after this response resolves, keeping mutation completion independent of RSC rendering.
  return {};
}
