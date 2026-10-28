"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import { getAccessToken } from "@/lib/api/session";
import {
  confirmDelivery,
  confirmPaymentReceived,
  confirmRefund,
  generateHandoverQr,
  getPaymentQr,
  getTransaction,
  rejectPaymentSlip,
  requestCancellation,
  respondToCancellation,
  scanHandoverQr,
  shipTransaction,
  uploadPaymentSlip,
  uploadRefundSlip,
  type PaymentQr,
} from "@/lib/api/transactions";
import { uploadImage } from "@/lib/api/uploads";
import type { Transaction } from "@/lib/api/types";

/**
 * Server actions for every transaction transition, same shape as
 * `lib/actions/items.ts`.
 *
 * These exist because `lib/api/transactions.ts` was read-only and the deal
 * screen advanced its own state with a 400ms timer instead. The stepper reads
 * from timestamp columns, so nothing it showed could ever change.
 */

async function requireSession(): Promise<void> {
  if (!(await getAccessToken())) {
    throw new Error("Not signed in");
  }
}

/**
 * Re-reads the transaction itself, for the room's poll.
 *
 * The poll already re-fetches messages and appointment cards, but not the
 * transaction they're about — so a party who isn't the one clicking buttons
 * never saw the other side's confirmations (a payment, a handover) land
 * without a manual reload: the stepper, the prompt, and every deal-timeline
 * card in `deal-timeline.ts` all read from this object, and it only ever
 * changed via a `router.refresh()` triggered by the viewer's own action.
 */
export async function fetchTransaction(transactionId: number): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return getTransaction(transactionId);
  });
}

export async function fetchPaymentQr(transactionId: number): Promise<ActionResult<PaymentQr>> {
  return runAction(async () => {
    await requireSession();
    return getPaymentQr(transactionId);
  });
}

/**
 * The slip is two calls — host the image, then attach the URL — and they are
 * one action so a client component never has to hold the intermediate URL.
 */
export async function submitPaymentSlip(
  transactionId: number,
  file: File,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    const url = await uploadImage(file);
    return uploadPaymentSlip(transactionId, url);
  });
}

export async function submitRefundSlip(
  transactionId: number,
  file: File,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    const url = await uploadImage(file);
    return uploadRefundSlip(transactionId, url);
  });
}

export async function confirmSlip(transactionId: number): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return confirmPaymentReceived(transactionId);
  });
}

export async function rejectSlip(
  transactionId: number,
  reason: string,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return rejectPaymentSlip(transactionId, reason);
  });
}

export async function saveTracking(
  transactionId: number,
  trackingNumber: string,
  estimatedDeliveryDate?: string,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return shipTransaction(transactionId, {
      tracking_number: trackingNumber,
      ...(estimatedDeliveryDate
        ? { estimated_delivery_date: estimatedDeliveryDate }
        : {}),
    });
  });
}

export async function confirmItemArrived(
  transactionId: number,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return confirmDelivery(transactionId);
  });
}

export async function confirmRefundReceived(
  transactionId: number,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return confirmRefund(transactionId);
  });
}

export async function askToCancel(
  transactionId: number,
  reason: string,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return requestCancellation(transactionId, reason);
  });
}

export async function answerCancellation(
  transactionId: number,
  response: "accept" | "reject",
  reason?: string,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return respondToCancellation(transactionId, response, reason);
  });
}

export async function createHandoverToken(
  transactionId: number,
): Promise<ActionResult<{ token: string; expiresInSeconds: number }>> {
  return runAction(async () => {
    await requireSession();
    return generateHandoverQr(transactionId);
  });
}

export async function completeHandover(
  transactionId: number,
  token: string,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireSession();
    return scanHandoverQr(transactionId, token);
  });
}
