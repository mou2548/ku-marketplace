import { apiFetch } from "./client";
import { toPost, type RawPost } from "./posts";
import { authHeader } from "./session";
import type { Item, Offer } from "./types";
import type { ItemCondition, OfferStatus } from "@/lib/status";

/**
 * `GET /offers` — every offer the signed-in user is a party to, both
 * directions. Not a spec endpoint: `GET /posts/:id/offers` only covers one
 * post, so the "what did I offer" half of the inbox (research R6) could not be
 * built without this. See `offers.controller.ts` / `posts.service.getMyOffers`.
 */

interface RawOfferItem {
  item_id: number;
  owner_id: number;
  name: string;
  quantity: number;
  category: string | null;
  condition: string | null;
  description: string | null;
  status: string | null;
  course_name: string | null;
  brand_model: string | null;
  warranty_expiry: string | null;
  size: string | null;
  images: Array<{
    image_id: number;
    item_id: number;
    image_url: string;
    is_primary: boolean;
    display_order: number;
  }>;
}

interface RawMyOffer {
  offer_id: number;
  post_id: number;
  proposer_id: number;
  additional_money: number;
  status: OfferStatus | null;
  created_at: string | null;
  transaction_id: number | null;
  proposer: { user_id: number; name: string; isVerified: boolean };
  items: RawOfferItem[];
  post: RawPost;
}

function toOfferItem(raw: RawOfferItem): Item {
  return {
    item_id: raw.item_id,
    owner_id: raw.owner_id,
    name: raw.name,
    quantity: raw.quantity,
    category: raw.category ?? "",
    condition: (raw.condition ?? "Good") as ItemCondition,
    description: raw.description,
    status: (raw.status ?? "Unlisted") as Item["status"],
    course_name: raw.course_name,
    brand_model: raw.brand_model,
    warranty_expiry: raw.warranty_expiry,
    size: raw.size,
    created_at: "",
    images: raw.images.map((img) => ({
      image_id: img.image_id,
      item_id: img.item_id,
      image_url: img.image_url,
      is_primary: img.is_primary,
      display_order: img.display_order,
    })),
  };
}

function toOffer(raw: RawMyOffer): Offer {
  return {
    offer_id: raw.offer_id,
    post_id: raw.post_id,
    proposer_id: raw.proposer_id,
    additional_money: raw.additional_money,
    status: (raw.status ?? "Pending") as OfferStatus,
    created_at: raw.created_at ?? "",
    transaction_id: raw.transaction_id,
    items: raw.items.map(toOfferItem),
    proposer: {
      user_id: raw.proposer.user_id,
      name: raw.proposer.name,
      isVerified: raw.proposer.isVerified,
      faculty: null,
      year: null,
    },
    post: toPost(raw.post),
  };
}

/** Every offer the signed-in user made or received. Auth. */
export async function getMyOffers(): Promise<Offer[]> {
  const raw = await apiFetch<RawMyOffer[]>("/offers", {
    headers: await authHeader(),
  });
  return raw.map(toOffer);
}
