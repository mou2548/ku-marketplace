/**
 * "How many units of this item can I still commit?" — the one answer the
 * inventory card (its Unlisted number), the `/post` picker and the trade
 * offer composer all have to agree on.
 *
 * Two sources feed it:
 *
 *   - `Item.status` (`item_status`). The API still writes `Transferred` on
 *     every offered item when a trade completes, and nothing else marks that
 *     hand-over: the summary only counts the listing's own item, so an item
 *     you traded away still reports every unit as available. Per decision D3
 *     (docs/ui-fix-plan.md) `Transferred` is authoritative.
 *   - `ItemHistorySummary` from `GET /items/:id/history-summary`, whose
 *     `available_quantity` is the API's own free-unit count. When the lookup
 *     failed, the item's quantity is the fallback and the API has the final
 *     say on submit.
 *
 * Not covered: an item offered in a trade that is still Pending or
 * Processing. That reservation lives on the offer, which neither source
 * carries, so the API's 409 is the only signal for it.
 */

import type { ItemHistorySummary } from "@/lib/api/types";

export interface AvailabilityItem {
  quantity: number;
  /** Raw `item_status`; only `Transferred` still means anything. */
  status?: string | null;
}

type AvailabilitySummary = Pick<
  ItemHistorySummary,
  "available_quantity" | "ongoing_quantity" | "channels"
>;

/**
 * True once the item has left the owner: marked `Transferred`, or every unit
 * is gone (sold, traded or given) with nothing open and no deal still
 * running. A known edge case: a closed giveaway whose winners have not all
 * collected drops out of `channels`, so it reads as handed over a little
 * early — see docs/design/api-gaps.md.
 */
export function isHandedOver(
  item: AvailabilityItem,
  summary?: AvailabilitySummary,
): boolean {
  if (item.status === "Transferred") return true;
  if (!summary) return false;
  return (
    summary.available_quantity <= 0 &&
    summary.channels.length === 0 &&
    summary.ongoing_quantity === 0
  );
}

/** Units still free to put into a new listing, giveaway or offer. */
export function freeUnits(
  item: AvailabilityItem,
  summary?: AvailabilitySummary,
): number {
  if (isHandedOver(item, summary)) return 0;
  return Math.max(0, summary ? summary.available_quantity : item.quantity);
}

export type UnavailableReason =
  | "handed-over"
  | "in-deal"
  | "all-listed"
  | "partly-listed";

/** Short enough to sit on an inventory slot. */
export const UNAVAILABLE_REASON_LABEL: Record<UnavailableReason, string> = {
  "handed-over": "Handed over",
  "in-deal": "In a deal",
  "all-listed": "All listed",
  "partly-listed": "Partly listed",
};

/**
 * Why this item cannot be used right now, or null when it can.
 *
 * `need` is what the caller is about to do with it: a listing or giveaway
 * takes `"some"` free units, a trade offer takes the item `"whole"` — the API
 * refuses an offered item unless every unit is free, and the composer's
 * split-off path edits the quantity, which the API only allows on a fully
 * free item too.
 */
export function unavailableReason(
  item: AvailabilityItem,
  summary: AvailabilitySummary | undefined,
  need: "some" | "whole",
): UnavailableReason | null {
  if (isHandedOver(item, summary)) return "handed-over";
  const free = freeUnits(item, summary);
  if (need === "some" ? free > 0 : free >= item.quantity) return null;
  if (summary && summary.ongoing_quantity > 0) return "in-deal";
  return free > 0 ? "partly-listed" : "all-listed";
}
