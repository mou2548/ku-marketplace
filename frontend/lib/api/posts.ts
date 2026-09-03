/**
 * Every `/posts` endpoint, typed against what the backend actually returns.
 *
 * Note the shapes differ from `types.ts`'s `Post` / `Offer`, which mirror the
 * database. The posts endpoints send a flattened, label-id form instead:
 * `post_id` is a string like `"post_001"`, the item is inlined as `item_name` /
 * `description`, and there is no nested `seller`. These interfaces describe that
 * wire form; map to the richer domain types at the call site if a screen needs
 * them. See docs/design/api-gaps.md.
 *
 * A post id argument accepts either the numeric id or the `"post_001"` label —
 * the backend strips the prefix either way.
 */

import { apiFetch, type RequestOptions } from "./client";
import type {
  DeliveryMethod,
  ItemCondition,
  OfferStatus,
  PostType,
} from "@/lib/status";
import type { Item, Post } from "./types";

export type PostId = string | number;

/** `active` while stock remains, `sold_out` at zero. Not the DB status enum. */
export type PostListingStatus = "active" | "sold_out";

/** Shape of one post as the `/posts` endpoints serialize it. */
export interface PostSummary {
  post_id: string;
  item_id: number;
  post_type: PostType;
  item_name: string;
  description: string | null;
  price: number;
  quantity_total: number;
  quantity_available: number;
  status: PostListingStatus;
  created_at: string | null;
}

/**
 * Wire shape of the nested `item` + `seller` the `/posts` endpoints now send
 * (see `posts.service.ts`'s `serializePost`). The flat fields above stay for
 * callers that never needed the rest.
 */
interface RawPostItemImage {
  image_id: number;
  item_id: number;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}
interface RawPostItem {
  item_id: number;
  owner_id: number | null;
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
  images: RawPostItemImage[];
}
export interface RawPost extends PostSummary {
  quantity_remaining?: number;
  item?: RawPostItem;
  seller?: {
    user_id: number;
    name: string;
    isVerified: boolean;
    faculty?: string | null;
    year?: number | null;
  } | null;
}

/** Strip the `post_001` label to the bare numeric id the UI routes on. */
function numericId(label: string): number {
  const m = /(\d+)$/.exec(label);
  return m ? Number(m[1]) : Number.NaN;
}

/**
 * The mutating endpoints answer with the wire label (`"post_001"`), while
 * `/market/[postId]` and `getPost` both take the number. Anything routing off
 * a mutation's response has to convert, or the link resolves to `NaN`.
 */
export function postIdToNumber(label: string): number {
  return numericId(label);
}

/**
 * Adapt the wire post to `lib/api/types.ts`'s rich `Post` — numeric ids, a
 * nested `Item` and a `UserSummary` seller — the shape the feed and detail
 * screens already consume. A post whose payload lacks the nested `item`
 * (older mutation responses) still maps, with an item synthesised from the
 * flat fields and no images.
 */
export function toPost(raw: RawPost): Post {
  const ri = raw.item;
  const item: Item = {
    item_id: ri?.item_id ?? raw.item_id,
    owner_id: ri?.owner_id ?? raw.seller?.user_id ?? 0,
    name: ri?.name ?? raw.item_name,
    quantity: ri?.quantity ?? 1,
    category: ri?.category ?? "",
    condition: (ri?.condition ?? "Good") as ItemCondition,
    description: ri?.description ?? raw.description,
    status: (ri?.status ?? "Listed") as Item["status"],
    course_name: ri?.course_name ?? null,
    brand_model: ri?.brand_model ?? null,
    warranty_expiry: ri?.warranty_expiry ?? null,
    size: ri?.size ?? null,
    created_at: raw.created_at ?? "",
    images: (ri?.images ?? []).map((img) => ({
      image_id: img.image_id,
      item_id: img.item_id,
      image_url: img.image_url,
      is_primary: img.is_primary,
      display_order: img.display_order,
    })),
  };
  return {
    post_id: numericId(raw.post_id),
    item_id: raw.item_id,
    post_type: raw.post_type,
    price: raw.price,
    quantity_remaining: raw.quantity_remaining ?? raw.quantity_available,
    description: raw.description,
    wanted_item_offer: null,
    created_at: raw.created_at ?? "",
    item,
    seller: {
      user_id: raw.seller?.user_id ?? item.owner_id,
      name: raw.seller?.name ?? "KU student",
      isVerified: raw.seller?.isVerified ?? true,
      faculty: raw.seller?.faculty ?? null,
      year: raw.seller?.year ?? null,
    },
  };
}

export interface OfferSummary {
  post_id: string;
  offer_id: string;
  offerer_id: number;
  item_ids: number[];
  additional_money: number;
  status: OfferStatus | null;
  created_at: string | null;
}

/**
 * `GET /posts/:id/offers` does not return a bare array — it wraps the list with
 * the post id: `{ post_id, offers: [...] }`. Verified against the running API.
 */
export interface OffersResponse {
  post_id: string;
  offers: OfferSummary[];
}

// ---- request payloads (match posts.service.ts) --------------------------------

export interface CreatePostPayload {
  item_id: number;
  post_type: PostType;
  price: number;
  quantity_total?: number;
}

export interface UpdatePostPayload {
  price: number;
}

export interface BuyPostPayload {
  buyer_id: number;
  delivery_method?: DeliveryMethod;
  quantity?: number;
}

export interface CreateOfferPayload {
  proposer_id: number;
  item_ids: number[];
  additional_money?: number;
}

export interface AcceptOfferPayload {
  delivery_method?: DeliveryMethod;
}

// ---- response payloads for the mutating endpoints -----------------------------

export interface UpdatePostResult {
  post_id: string;
  price: number;
}

export interface DeletePostResult {
  post_id: string;
  deleted: boolean;
}

export interface BuyPostResult {
  transaction_id: string;
  post_id: string;
  buyer_id: number;
  delivery_method: DeliveryMethod;
  quantity: number;
  status: string;
}

export interface AcceptOfferResult {
  transaction_id: string;
  post_id: string;
  offer_id: string;
  delivery_method: DeliveryMethod;
  status: "accepted";
}

export interface OfferStatusChangeResult {
  post_id: string;
  offer_id: string;
  status: string;
}

// ---- endpoints ---------------------------------------------------------------

/** `GET /posts` — every listed post, newest first, as the rich `Post`. Public. */
export async function listPosts(opts?: RequestOptions): Promise<Post[]> {
  const raw = await apiFetch<RawPost[]>("/posts", opts);
  return raw.map(toPost);
}

/** `GET /posts/:post_id` — one post as the rich `Post`. Public. */
export async function getPost(postId: PostId, opts?: RequestOptions): Promise<Post> {
  return toPost(await apiFetch<RawPost>(`/posts/${postId}`, opts));
}

/** `POST /posts` — list an item for sale or trade. Auth. */
export function createPost(
  payload: CreatePostPayload,
  opts?: RequestOptions,
): Promise<PostSummary> {
  return apiFetch<PostSummary>("/posts", { ...opts, method: "POST", body: payload });
}

/** `PATCH /posts/:post_id` — change the asking price. Auth. */
export function updatePost(
  postId: PostId,
  payload: UpdatePostPayload,
  opts?: RequestOptions,
): Promise<UpdatePostResult> {
  return apiFetch<UpdatePostResult>(`/posts/${postId}`, {
    ...opts,
    method: "PATCH",
    body: payload,
  });
}

/** `DELETE /posts/:post_id` — unlist. Rejected if offers/transactions exist. Auth. */
export function deletePost(
  postId: PostId,
  opts?: RequestOptions,
): Promise<DeletePostResult> {
  return apiFetch<DeletePostResult>(`/posts/${postId}`, { ...opts, method: "DELETE" });
}

/** `POST /posts/:post_id/buy` — buy directly, opening a transaction. Auth. */
export function buyPost(
  postId: PostId,
  payload: BuyPostPayload,
  opts?: RequestOptions,
): Promise<BuyPostResult> {
  return apiFetch<BuyPostResult>(`/posts/${postId}/buy`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `POST /posts/:post_id/offers` — propose a trade. Auth. */
export function createOffer(
  postId: PostId,
  payload: CreateOfferPayload,
  opts?: RequestOptions,
): Promise<OfferSummary> {
  return apiFetch<OfferSummary>(`/posts/${postId}/offers`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `GET /posts/:post_id/offers` — offers on a post, wrapped as `{ post_id, offers }`. Public. */
export function listOffers(
  postId: PostId,
  opts?: RequestOptions,
): Promise<OffersResponse> {
  return apiFetch<OffersResponse>(`/posts/${postId}/offers`, opts);
}

/** `POST /posts/:post_id/offers/:offer_id/accept` — seller accepts. Auth. */
export function acceptOffer(
  postId: PostId,
  offerId: PostId,
  payload: AcceptOfferPayload = {},
  opts?: RequestOptions,
): Promise<AcceptOfferResult> {
  return apiFetch<AcceptOfferResult>(`/posts/${postId}/offers/${offerId}/accept`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `POST /posts/:post_id/offers/:offer_id/withdraw` — proposer takes it back. Auth. */
export function withdrawOffer(
  postId: PostId,
  offerId: PostId,
  opts?: RequestOptions,
): Promise<OfferStatusChangeResult> {
  return apiFetch<OfferStatusChangeResult>(
    `/posts/${postId}/offers/${offerId}/withdraw`,
    { ...opts, method: "POST" },
  );
}

/** `POST /posts/:post_id/offers/:offer_id/reject` — seller declines. Auth. */
export function rejectOffer(
  postId: PostId,
  offerId: PostId,
  opts?: RequestOptions,
): Promise<OfferStatusChangeResult> {
  return apiFetch<OfferStatusChangeResult>(
    `/posts/${postId}/offers/${offerId}/reject`,
    { ...opts, method: "POST" },
  );
}
