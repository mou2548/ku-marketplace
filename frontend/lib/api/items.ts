import { apiFetch, type RequestOptions } from "./client";
import { authHeader, getCurrentUserId } from "./session";
import type { Item, ItemHistorySummary } from "./types";

/** Raw `/items` shape — camelCase, straight off Prisma. */
interface RawItemImage {
  imageId: number;
  itemId: number;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
}

interface RawItem {
  itemId: number;
  ownerId: number;
  name: string;
  category: string;
  condition: string;
  quantity: number;
  description: string | null;
  courseName: string | null;
  brandModel: string | null;
  warrantyExpiry: string | null;
  size: string | null;
  createdAt: string;
  images: RawItemImage[];
}

/** Adapts the real shape to `lib/api/types.ts`'s `Item` (snake_case, mirrors the PDF). */
function toItem(raw: RawItem): Item {
  return {
    item_id: raw.itemId,
    owner_id: raw.ownerId,
    name: raw.name,
    quantity: raw.quantity,
    category: raw.category,
    condition: raw.condition as Item["condition"],
    description: raw.description,
    course_name: raw.courseName,
    brand_model: raw.brandModel,
    warranty_expiry: raw.warrantyExpiry,
    size: raw.size,
    created_at: raw.createdAt,
    images: raw.images.map((img) => ({
      image_id: img.imageId,
      item_id: img.itemId,
      image_url: img.imageUrl,
      is_primary: img.isPrimary,
      display_order: img.displayOrder,
    })),
  };
}

/** Body for `POST /items` / `PATCH /items/:id` — snake_case, per `CreateItemDto`. */
export interface ItemPayload {
  name: string;
  category: string;
  condition: string;
  quantity?: number;
  description?: string;
  course_name?: string;
  brand_model?: string;
  warranty_expiry?: string;
  size?: string;
  images?: Array<{ image_url: string; is_primary?: boolean; display_order?: number }>;
}

/** `GET /items` — public, no owner filter. */
export async function getItems(opts?: RequestOptions): Promise<Item[]> {
  const raw = await apiFetch<RawItem[]>("/items", opts);
  return raw.map(toItem);
}

/** `GET /items/:item_id` — public. */
export async function getItem(id: number): Promise<Item> {
  return toItem(await apiFetch<RawItem>(`/items/${id}`));
}

/** Owner-only completed outcome totals for one inventory item. */
export async function getItemHistorySummary(
  id: number,
): Promise<ItemHistorySummary> {
  return apiFetch<ItemHistorySummary>(`/items/${id}/history-summary`, {
    headers: await authHeader(),
  });
}

/**
 * `GET /items` filtered to the signed-in owner — there is no owner query
 * param on the real endpoint, so this fetches everything and filters here.
 * Named to match `lib/api/fixtures.ts`'s `getMyItems()` so pages only change
 * their import, not their call site (see `lib/api/types.ts`'s header comment).
 */
export async function getMyItems(opts?: RequestOptions): Promise<Item[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const items = await getItems(opts);
  return items.filter((i) => i.owner_id === userId);
}

export async function createItem(payload: ItemPayload): Promise<Item> {
  return toItem(
    await apiFetch<RawItem>("/items", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: await authHeader(),
    }),
  );
}

export async function updateItem(id: number, payload: Partial<ItemPayload>): Promise<Item> {
  return toItem(
    await apiFetch<RawItem>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: await authHeader(),
    }),
  );
}

/** Soft delete (`items.service.ts`: sets `deletedAt`, ownership-checked server-side). */
export async function deleteItem(id: number): Promise<void> {
  await apiFetch(`/items/${id}`, { method: "DELETE", headers: await authHeader() });
}
