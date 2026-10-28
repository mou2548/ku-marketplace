import { apiFetch } from "./client";
import { authHeader } from "./session";
import type { Transaction } from "./types";

/**
 * `GET /transactions` / `GET /transactions/{id}` — `transaction.service.ts`
 * now serializes the full join (item, images, buyer, seller) rather than a
 * raw row, so this is close to a pass-through; kept as an explicit adapter
 * (not a bare re-export) to match every other `lib/api/*.ts` module's shape
 * and give the response a single place to adapt from if that ever changes.
 *
 * Scoped to the signed-in user server-side (buyer or seller) — there is no
 * `user_id` query param to pass.
 */

async function authedInit(): Promise<RequestInit> {
  return { headers: await authHeader() };
}

/** GET /transactions — every transaction the signed-in user is a party to. */
export async function getTransactions(): Promise<Transaction[]> {
  const init = await authedInit();
  return apiFetch<Transaction[]>("/transactions", init);
}

/** GET /transactions/{id} */
export async function getTransaction(transactionId: number): Promise<Transaction> {
  const init = await authedInit();
  return apiFetch<Transaction>(`/transactions/${transactionId}`, init);
}

/** §7.1/§7.5.3 — GET /admin/transactions/{id}, for an admin reviewing a
 * Transaction-type report's evidence (no buyer/seller participant check). */
/** `GET /transactions/{id}/payment-qr` — what the buyer pays, as a PromptPay QR. */
export interface PaymentQr {
  /** EMVCo PromptPay payload for this deal's amount; encode it as the QR. */
  payload: string;
  amount: number;
  /** The seller's PromptPay number, masked by the API (enough to recognise). */
  promptpay_id: string;
}

/** Buyer only, while the deal is awaiting payment. */
export async function getPaymentQr(transactionId: number): Promise<PaymentQr> {
  const init = await authedInit();
  return apiFetch<PaymentQr>(`/transactions/${transactionId}/payment-qr`, init);
}

export async function adminGetTransaction(transactionId: number): Promise<Transaction> {
  const init = await authedInit();
  return apiFetch<Transaction>(`/admin/transactions/${transactionId}`, init);
}

// ---- fulfilment and payment -------------------------------------------------
//
// Every mutating transaction endpoint below is transcribed from
// `fornewdesign/API_Marketplace.pdf`, "Transactions, Fulfillment & Payment".
// Until this point the module was read-only and every transition in the UI was
// a placeholder (see docs/design/audit-2026.md).

async function post<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    headers: await authHeader(),
    method: "POST",
    ...(body === undefined ? {} : { body }),
  });
}

/** POST /transactions/{id}/payment-slip — the buyer's transfer evidence. */
export async function uploadPaymentSlip(
  transactionId: number,
  slipImageUrl: string,
): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/payment-slip`, {
    slip_image_url: slipImageUrl,
  });
}

/** POST /transactions/{id}/confirm-payment-received — the seller accepts the slip. */
export async function confirmPaymentReceived(
  transactionId: number,
): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/confirm-payment-received`, {});
}

/** POST /transactions/{id}/ship — tracking details. Shipping deliveries only. */
export async function shipTransaction(
  transactionId: number,
  payload: { tracking_number: string; estimated_delivery_date?: string },
): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/ship`, payload);
}

/** POST /transactions/{id}/confirm-delivery — the buyer confirms arrival. */
export async function confirmDelivery(transactionId: number): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/confirm-delivery`, {});
}

/** POST /transactions/{id}/cancel-request — one side asks to cancel. */
export async function requestCancellation(
  transactionId: number,
  reason: string,
): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/cancel-request`, { reason });
}

/**
 * POST /transactions/{id}/cancel-request/respond — the other side answers.
 *
 * A reject flips `dispute_status` to `under_review` immediately, so the reason
 * is the only context an admin gets. Optional in the contract; the UI should
 * ask for it.
 */
export async function respondToCancellation(
  transactionId: number,
  response: "accept" | "reject",
  reason?: string,
): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/cancel-request/respond`, {
    response: response === "accept" ? "Approved" : "Rejected",
    ...(reason ? { reason } : {}),
  });
}

/** POST /transactions/{id}/refund-slip — the seller's refund evidence. */
export async function uploadRefundSlip(
  transactionId: number,
  refundSlipUrl: string,
): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/refund-slip`, {
    refund_slip_url: refundSlipUrl,
  });
}

/** POST /transactions/{id}/confirm-refund — the buyer confirms the refund landed. */
export async function confirmRefund(transactionId: number): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/confirm-refund`, {});
}

/**
 * POST /transactions/{id}/qr/generate — the seller's handover token.
 *
 * The server issues one code per 15-minute window: while a code is alive this
 * returns the same token with the seconds it has left, so a reopened QR keeps
 * counting the original window down.
 */
export async function generateHandoverQr(
  transactionId: number,
): Promise<{ token: string; expiresInSeconds: number }> {
  return post<{ token: string; expiresInSeconds: number }>(
    `/transactions/${transactionId}/qr/generate`,
    {},
  );
}

/** POST /transactions/{id}/qr/scan — the buyer closes the deal in person. */
export async function scanHandoverQr(
  transactionId: number,
  token: string,
): Promise<Transaction> {
  return post<Transaction>(`/transactions/${transactionId}/qr/scan`, { token });
}
