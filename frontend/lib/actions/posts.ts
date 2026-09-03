"use server";

import {
  acceptOffer,
  createOffer,
  createPost,
  rejectOffer,
  withdrawOffer,
  type AcceptOfferResult,
  type CreateOfferPayload,
  type CreatePostPayload,
  type OfferStatusChangeResult,
  type OfferSummary,
  type PostSummary,
} from "@/lib/api/posts";
import { getAccessToken, getCurrentUserId } from "@/lib/api/session";

/**
 * Plain async actions, same shape as `lib/actions/items.ts` — each caller
 * already owns its busy/toast state around a single call.
 *
 * These exist because the five mutating post and offer endpoints in
 * `lib/api/posts.ts` had no server-side entry point, so every call site was a
 * `setTimeout` placeholder instead (see docs/design/audit-2026.md).
 */

async function requireUserId(): Promise<number> {
  if (!(await getAccessToken())) {
    throw new Error("Not signed in");
  }
  const userId = await getCurrentUserId();
  if (userId == null) {
    throw new Error("Not signed in");
  }
  return userId;
}

async function requireSession(): Promise<void> {
  if (!(await getAccessToken())) {
    throw new Error("Not signed in");
  }
}

/** `POST /posts` — put an owned item on the market. */
export async function publishListing(
  payload: CreatePostPayload,
): Promise<PostSummary> {
  await requireSession();
  return createPost(payload);
}

/**
 * `POST /posts/:post_id/offers` — propose a trade.
 *
 * `proposer_id` is read from the session rather than passed in: the client has
 * no business naming who is proposing.
 */
export async function sendOffer(
  postId: string,
  payload: Omit<CreateOfferPayload, "proposer_id">,
): Promise<OfferSummary> {
  const proposerId = await requireUserId();
  return createOffer(postId, { ...payload, proposer_id: proposerId });
}

/** `POST /posts/:post_id/offers/:offer_id/accept` — seller accepts. */
export async function acceptOfferAction(
  postId: string,
  offerId: string,
): Promise<AcceptOfferResult> {
  await requireSession();
  // Meetup-only: a trade has no shipping branch (see PRODUCT.md).
  return acceptOffer(postId, offerId, { delivery_method: "Meetup" });
}

/** `POST /posts/:post_id/offers/:offer_id/reject` — seller declines. */
export async function rejectOfferAction(
  postId: string,
  offerId: string,
): Promise<OfferStatusChangeResult> {
  await requireSession();
  return rejectOffer(postId, offerId);
}

/** `POST /posts/:post_id/offers/:offer_id/withdraw` — proposer takes it back. */
export async function withdrawOfferAction(
  postId: string,
  offerId: string,
): Promise<OfferStatusChangeResult> {
  await requireSession();
  return withdrawOffer(postId, offerId);
}
