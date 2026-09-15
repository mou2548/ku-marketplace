"use server";

import { getAccessToken } from "@/lib/api/session";
import {
  confirmDelivery,
  confirmPaymentReceived,
  confirmRefund,
  generateHandoverQr,
  requestCancellation,
  respondToCancellation,
  scanHandoverQr,
  shipTransaction,
  uploadPaymentSlip,
  uploadRefundSlip,
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
 * The slip is two calls — host the image, then attach the URL — and they are
 * one action so a client component never has to hold the intermediate URL.
 */
export async function submitPaymentSlip(
  transactionId: number,
  file: File,
): Promise<Transaction> {
  await requireSession();
  const url = await uploadImage(file);
  return uploadPaymentSlip(transactionId, url);
}

export async function submitRefundSlip(
  transactionId: number,
  file: File,
): Promise<Transaction> {
  await requireSession();
  const url = await uploadImage(file);
  return uploadRefundSlip(transactionId, url);
}

export async function confirmSlip(transactionId: number): Promise<Transaction> {
  await requireSession();
  return confirmPaymentReceived(transactionId);
}

export async function saveTracking(
  transactionId: number,
  trackingNumber: string,
  estimatedDeliveryDate?: string,
): Promise<Transaction> {
  await requireSession();
  return shipTransaction(transactionId, {
    tracking_number: trackingNumber,
    ...(estimatedDeliveryDate
      ? { estimated_delivery_date: estimatedDeliveryDate }
      : {}),
  });
}

export async function confirmItemArrived(
  transactionId: number,
): Promise<Transaction> {
  await requireSession();
  return confirmDelivery(transactionId);
}

export async function confirmRefundReceived(
  transactionId: number,
): Promise<Transaction> {
  await requireSession();
  return confirmRefund(transactionId);
}

export async function askToCancel(
  transactionId: number,
  reason: string,
): Promise<Transaction> {
  await requireSession();
  return requestCancellation(transactionId, reason);
}

export async function answerCancellation(
  transactionId: number,
  response: "accept" | "reject",
  reason?: string,
): Promise<Transaction> {
  await requireSession();
  return respondToCancellation(transactionId, response, reason);
}

export async function createHandoverToken(
  transactionId: number,
): Promise<{ token: string; expiresInSeconds: number }> {
  await requireSession();
  return generateHandoverQr(transactionId);
}

export async function completeHandover(
  transactionId: number,
  token: string,
): Promise<Transaction> {
  await requireSession();
  return scanHandoverQr(transactionId, token);
}
