import type { Transaction } from "@/lib/api/types";

/**
 * The seller turned the latest slip down and the buyer has not sent a new one.
 * Mirrors `slipRejected` in the backend's transaction.service.ts: a paid deal
 * only reaches Processing through a slip, so Processing with the buyer's
 * upload time still set but no slip on file means it was rejected.
 */
export function isSlipRejected(
  tx: Pick<
    Transaction,
    "status" | "payment_confirmed_by_buyer_at" | "slip_image_url" | "payment_confirmed_by_seller_at"
  >,
): boolean {
  return (
    tx.status === "Processing" &&
    !!tx.payment_confirmed_by_buyer_at &&
    !tx.slip_image_url &&
    !tx.payment_confirmed_by_seller_at
  );
}
