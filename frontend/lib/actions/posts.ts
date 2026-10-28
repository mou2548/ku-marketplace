"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import {
  acceptOffer,
  buyPost,
  type BuyPostPayload,
  type BuyPostResult,
  createOffer,
  createPost,
  deletePost,
  type DeletePostResult,
  rejectOffer,
  updatePost,
  withdrawOffer,
  type AcceptOfferResult,
  type CreateOfferPayload,
  type CreatePostPayload,
  type OfferStatusChangeResult,
  type OfferSummary,
  type PostId,
  type PostSummary,
  type UpdatePostPayload,
  type UpdatePostResult,
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

async function requireUser(): Promise<{ token: string; userId: number }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }
  const userId = await getCurrentUserId();
  if (userId == null) {
    throw new Error("Not signed in");
  }
  return { token, userId };
}

async function requireSession(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }
  return token;
}

/** `POST /posts` — put an owned item on the market. */
export async function publishListing(
  payload: CreatePostPayload,
): Promise<ActionResult<PostSummary>> {
  return runAction(async () => {
    const token = await requireSession();
    return createPost(payload, { token });
  });
}

/** `PATCH /posts/:post_id` — change the asking price and/or the sale kind. */
export async function updateListing(
  postId: PostId,
  payload: UpdatePostPayload,
): Promise<ActionResult<UpdatePostResult>> {
  return runAction(async () => {
    const token = await requireSession();
    return updatePost(postId, payload, { token });
  });
}

/**
 * `DELETE /posts/:post_id` — unlist this channel. Rejected server-side if a
 * Pending offer or non-Cancelled transaction is attached to it. Never had a
 * UI control wired to it before this.
 */
export async function unlistListing(
  postId: PostId,
): Promise<ActionResult<DeletePostResult>> {
  return runAction(async () => {
    const token = await requireSession();
    return deletePost(postId, { token });
  });
}

/**
 * `POST /posts/:post_id/offers` — propose a trade.
 *
 * `proposer_id` is read from the session rather than passed in: the client has
 * no business naming who is proposing.
 */
export async function sendOffer(
  postId: PostId,
  payload: Omit<CreateOfferPayload, "proposer_id">,
): Promise<ActionResult<OfferSummary>> {
  return runAction(async () => {
    const { token, userId: proposerId } = await requireUser();
    return createOffer(postId, { ...payload, proposer_id: proposerId }, { token });
  });
}

/** `POST /posts/:post_id/offers/:offer_id/accept` — seller accepts. */
export async function acceptOfferAction(
  postId: PostId,
  offerId: PostId,
): Promise<ActionResult<AcceptOfferResult>> {
  return runAction(async () => {
    const token = await requireSession();
    // Meetup-only: a trade has no shipping branch (see PRODUCT.md).
    return acceptOffer(postId, offerId, { delivery_method: "Meetup" }, { token });
  });
}

/** `POST /posts/:post_id/offers/:offer_id/reject` — seller declines. */
export async function rejectOfferAction(
  postId: PostId,
  offerId: PostId,
): Promise<ActionResult<OfferStatusChangeResult>> {
  return runAction(async () => {
    const token = await requireSession();
    return rejectOffer(postId, offerId, { token });
  });
}

/** `POST /posts/:post_id/offers/:offer_id/withdraw` — proposer takes it back. */
export async function withdrawOfferAction(
  postId: PostId,
  offerId: PostId,
): Promise<ActionResult<OfferStatusChangeResult>> {
  return runAction(async () => {
    const token = await requireSession();
    return withdrawOffer(postId, offerId, { token });
  });
}

/** Create a purchase using the authenticated buyer and return the real deal ID. */
export async function buyPostAction(postId: PostId, payload: Omit<BuyPostPayload, "buyer_id">): Promise<ActionResult<BuyPostResult>> {
  return runAction(async () => {
    const { token, userId } = await requireUser();
    return buyPost(postId, { ...payload, buyer_id: userId }, { token });
  });
}
