import { notFound } from "next/navigation";
import {
  parseSellerQuery,
  SellerProfileView,
} from "@/components/features/sellers/seller-profile-view";
import { getSeller, getSellerPosts, getFollowState } from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { getAccessToken, getCurrentUserId } from "@/lib/api/session";

export const metadata = { title: "Seller - KU Marketplace" };

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ sellerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sellerId } = await params;
  if (!/^[1-9]\d*$/.test(sellerId) || Number(sellerId) > 2147483647) notFound();
  const id = Number(sellerId);
  const [raw, token, viewerId] = await Promise.all([
    searchParams,
    getAccessToken(),
    getCurrentUserId(),
  ]);
  const query = parseSellerQuery(raw);
  const profile = await getSeller(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [listings, follow] = await Promise.all([
    getSellerPosts(id, query),
    token && viewerId !== id
      ? getFollowState(id, token).catch(() => null)
      : Promise.resolve(null),
  ]);
  return (
    <SellerProfileView
      profile={profile}
      listings={listings}
      query={query}
      pathname={`/sellers/${id}`}
      signedIn={Boolean(token)}
      following={follow?.is_following ?? null}
      mine={viewerId === id}
    />
  );
}
