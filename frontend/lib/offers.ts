import { getItem } from "@/lib/items";
import { POSTS, getPostByItemId, type Post } from "@/lib/posts";

/**
 * Swap offers — proposal §3.2–§3.4.
 *
 * The rule that shapes everything here: an offer binds items without locking
 * them (§3.2). One item may sit in several pending offers at once, and stay
 * listed on its own post meanwhile. Only acceptance locks anything, and when
 * it does it withdraws that item from every other channel at once (§3.3).
 */
export type OfferStatus =
  | "pending"
  | "accepted"
  /** Turned down by the post owner. */
  | "rejected"
  /** §3.3 — killed automatically because a rival offer on the same post won. */
  | "auto-rejected"
  /** §3.4 — pulled back by the sender, or voided when an item was deleted. */
  | "withdrawn";

export const OFFER_STATUS_LABELS: Record<OfferStatus, { th: string; en: string }> = {
  pending: { th: "รอการตอบรับ", en: "Pending" },
  accepted: { th: "ตอบรับแล้ว", en: "Accepted" },
  rejected: { th: "ถูกปฏิเสธ", en: "Declined" },
  "auto-rejected": { th: "ถูกปฏิเสธอัตโนมัติ", en: "Auto-declined" },
  withdrawn: { th: "ถอนข้อเสนอแล้ว", en: "Withdrawn" },
};

export interface Offer {
  id: string;
  postId: string;
  fromUserId: string;
  fromName: string;
  /** §3.2 — several of the sender's items may make up one offer. */
  offeredItemIds: string[];
  /** §3.2 — optional cash sweetener on top of the items. */
  topUpAmount?: number;
  status: OfferStatus;
  createdAt: string;
}

// TODO: replace with the real offer data from the API
export const OFFERS: Offer[] = [
  {
    id: "offer-1",
    postId: "post-1",
    fromUserId: "user-ploy",
    fromName: "Nong Ploy",
    offeredItemIds: ["item-9"],
    status: "pending",
    createdAt: "2026-08-06T13:05:00+07:00",
  },
  {
    id: "offer-2",
    postId: "post-1",
    fromUserId: "user-chaya",
    fromName: "Chaya R.",
    offeredItemIds: ["item-11"],
    topUpAmount: 200,
    status: "pending",
    createdAt: "2026-08-06T14:20:00+07:00",
  },
  {
    id: "offer-3",
    postId: "post-2",
    fromUserId: "user-anan",
    fromName: "Anan W.",
    offeredItemIds: ["item-12"],
    status: "rejected",
    createdAt: "2026-08-04T10:00:00+07:00",
  },
];

export function getOffer(offerId: string): Offer | undefined {
  return OFFERS.find((offer) => offer.id === offerId);
}

export function getPost(postId: string): Post | undefined {
  return POSTS.find((post) => post.id === postId);
}

export function offersForPost(postId: string): Offer[] {
  return OFFERS.filter((offer) => offer.postId === postId);
}

/** Offers sitting on posts owned by this user. */
export function offersReceivedBy(userId: string): Offer[] {
  return OFFERS.filter((offer) => getPost(offer.postId)?.ownerId === userId);
}

export function offersSentBy(userId: string): Offer[] {
  return OFFERS.filter((offer) => offer.fromUserId === userId);
}

/**
 * §3.3 — everything that dies the moment `offer` is accepted, so the owner can
 * be shown the consequences before committing rather than after.
 *
 * Two separate effects, and the proposal requires a notification for each:
 *   rivals  — other pending offers on the same post, auto-declined
 *   pulled  — other channels the accepted items were sitting in: offers they
 *             were part of elsewhere, and their own still-open posts
 */
export function acceptanceFallout(offer: Offer): {
  rivals: Offer[];
  pulledOffers: Offer[];
  pulledPosts: Post[];
} {
  const rivals = offersForPost(offer.postId).filter(
    (other) => other.id !== offer.id && other.status === "pending"
  );

  const pulledOffers = OFFERS.filter(
    (other) =>
      other.id !== offer.id &&
      other.status === "pending" &&
      other.offeredItemIds.some((itemId) => offer.offeredItemIds.includes(itemId))
  );

  const pulledPosts = offer.offeredItemIds
    .map((itemId) => getPostByItemId(itemId))
    .filter((post) => post !== undefined);

  return { rivals, pulledOffers, pulledPosts };
}

/** Display helper: the items an offer puts on the table, resolved. */
export function offeredItems(offer: Offer) {
  return offer.offeredItemIds.map(getItem).filter((item) => item !== undefined);
}
