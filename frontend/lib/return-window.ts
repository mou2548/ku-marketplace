import type { Transaction } from "@/lib/api/types";

/** `requestCancellation` in transaction.service.ts: returns close 7 days after completion. */
export const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReturnWindow {
  /** Epoch ms the window closes. */
  closesAt: number;
  /** Whole days left, rounded up, so the last few hours still read "1 day". */
  daysLeft: number;
}

/**
 * The return window of a completed deal, while a return can still be asked
 * for. Mirrors the backend's check: completion is the buyer's receipt
 * (`item_received_confirmed_by_buyer_at`), only one request per deal, and an
 * open report locks every step. `undefined` when no return can be requested.
 */
export function openReturnWindow(
  tx: Pick<
    Transaction,
    | "status"
    | "item_received_confirmed_by_buyer_at"
    | "cancellation_requested_by"
    | "active_report_id"
  >,
  now: number,
): ReturnWindow | undefined {
  if (tx.status !== "Completed") return undefined;
  if (tx.cancellation_requested_by != null || tx.active_report_id) return undefined;
  if (!tx.item_received_confirmed_by_buyer_at) return undefined;
  const completedAt = Date.parse(tx.item_received_confirmed_by_buyer_at);
  if (!Number.isFinite(completedAt)) return undefined;
  const closesAt = completedAt + RETURN_WINDOW_MS;
  const left = closesAt - now;
  if (left <= 0) return undefined;
  return { closesAt, daysLeft: Math.max(1, Math.ceil(left / DAY_MS)) };
}
