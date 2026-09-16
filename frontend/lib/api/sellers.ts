import { apiFetch } from "./client";
import { toPost, type RawPost } from "./posts";

export interface SellerProfile {
  user_id: number;
  name: string;
  is_verified: boolean;
  member_since: string | null;
  active_listing_count: number;
  follower_count: number;
}
export interface PageResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface FollowState {
  seller_id: number;
  is_following: boolean;
  follower_count: number;
}
export interface FollowedSeller {
  seller_id: number;
  profile: SellerProfile | null;
}
export function getSeller(id: number) {
  return apiFetch<SellerProfile>(`/sellers/${id}`, { cache: "no-store" });
}
export async function getSellerPosts(
  id: number,
  query: URLSearchParams = new URLSearchParams(),
) {
  const result = await apiFetch<PageResult<RawPost>>(
    `/sellers/${id}/posts?${query}`,
    { cache: "no-store" },
  );
  return { ...result, data: result.data.map(toPost) };
}
export function getFollowState(id: number, token: string) {
  return apiFetch<FollowState>(`/users/me/following/${id}`, {
    token,
    cache: "no-store",
  });
}
export function getFollowing(token: string, page: number) {
  return apiFetch<PageResult<FollowedSeller>>(
    `/users/me/following?page=${page}`,
    { token, cache: "no-store" },
  );
}
