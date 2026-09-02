/**
 * Every `/transactions` endpoint. Two backend controllers share the prefix —
 * the deal lifecycle (`transaction.controller.ts`) and the room's messages plus
 * appointment cards (`transactions.controller.ts`) — gathered here as one module.
 *
 * Every endpoint is behind `JwtAuthGuard`, and the actor is taken from the token,
 * never the body — so a call with no token 401s. The `:id` is a plain integer
 * (no `"transaction_001"` label form, unlike posts).
 *
 * Shape note, verified against the running API: these endpoints return raw Prisma
 * rows, so the wire form is **camelCase** (`transactionId`, `finalAmount`), a
 * different convention from the posts endpoints' snake_case serializers. The type
 * is named `TransactionRecord` to keep it distinct from the snake_case domain
 * `Transaction` in `types.ts`. The envelope is only two layers deep here
 * (`data.data`), not three — `apiFetch` unwraps either.
 */

import { apiFetch, type RequestOptions } from "./client";
import type { DeliveryMethod, TransactionStatus } from "@/lib/status";

/** Only a responder's two choices — `Pending` is the waiting state, never sent. */
export type CancellationDecision = "Approved" | "Rejected";

/** One transaction as the lifecycle endpoints return it (camelCase Prisma row). */
export interface TransactionRecord {
  transactionId: number;
  postId: number;
  offerId: number | null;
  buyerId: number;
  sellerId: number;
  quantity: number;
  status: TransactionStatus;
  activeReportId: number | null;
  deliveryMethod: DeliveryMethod;
  slipImageUrl: string | null;
  trackingNumber: string | null;
  estimatedDeliveryDate: string | null;
  paymentConfirmedByBuyerAt: string | null;
  paymentConfirmedBySellerAt: string | null;
  itemReceivedConfirmedByBuyerAt: string | null;
  itemReceivedConfirmedBySellerAt: string | null;
  itemReturnConfirmedAt: string | null;
  cancellationRequestedBy: number | null;
  cancellationReason: string | null;
  cancellationRequestedAt: string | null;
  cancellationResponse: CancellationDecision | null;
  refundSlipUrl: string | null;
  refundConfirmedByBuyer: boolean;
  createdAt: string | null;
}

/** One chat message in a transaction's room. */
export interface ChatMessage {
  messageId: number;
  roomId: number;
  senderId: number;
  content: string | null;
  imageUrls: string[] | null;
  createdAt: string | null;
}

/** An appointment card proposed for a meetup. */
export interface AppointmentCard {
  appointmentId: number;
  transactionId: number;
  proposedBy: number;
  /** ISO — the date component is what matters. */
  date: string;
  /** ISO on a 1970 epoch date — the time component is what matters. */
  time: string;
  location: string;
  status: string;
  createdAt: string | null;
}

/** A short-lived meetup QR token, held in Redis, not persisted. */
export interface QrToken {
  token: string;
  url: string;
  expiresInSeconds: number;
}

// ---- request payloads (match the DTOs) ---------------------------------------

export interface UploadPaymentSlipPayload {
  slip_image_url: string;
}

export interface ShipPayload {
  tracking_number: string;
  /** ISO date string. */
  estimated_delivery_date: string;
}

export interface ScanQrPayload {
  token: string;
}

export interface UploadRefundSlipPayload {
  refund_slip_url: string;
}

export interface RequestCancellationPayload {
  reason: string;
}

export interface RespondCancellationPayload {
  response: CancellationDecision;
}

export interface SendMessagePayload {
  content?: string;
  image_urls?: string[];
}

export interface CreateAppointmentPayload {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  time: string;
  location: string;
}

// ---- lifecycle endpoints -----------------------------------------------------

/** `GET /transactions` — every transaction the caller is buyer or seller of. */
export function listTransactions(opts?: RequestOptions): Promise<TransactionRecord[]> {
  return apiFetch<TransactionRecord[]>("/transactions", opts);
}

/** `GET /transactions/:id` — one transaction, if the caller is party to it. */
export function getTransaction(
  id: number,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}`, opts);
}

/** `POST /:id/payment-slip` — buyer uploads the transfer slip. Pending → Processing. */
export function uploadPaymentSlip(
  id: number,
  payload: UploadPaymentSlipPayload,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/payment-slip`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `POST /:id/confirm-payment-received` — seller confirms the money arrived. */
export function confirmPaymentReceived(
  id: number,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/confirm-payment-received`, {
    ...opts,
    method: "POST",
  });
}

/** `POST /:id/ship` — seller records the tracking number. Stays Processing. */
export function shipTransaction(
  id: number,
  payload: ShipPayload,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/ship`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `POST /:id/confirm-delivery` — buyer confirms receipt (Shipping). → Completed. */
export function confirmDelivery(
  id: number,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/confirm-delivery`, {
    ...opts,
    method: "POST",
  });
}

/** `POST /:id/qr/generate` — seller gets a 15-minute meetup QR token. */
export function generateQr(id: number, opts?: RequestOptions): Promise<QrToken> {
  return apiFetch<QrToken>(`/transactions/${id}/qr/generate`, {
    ...opts,
    method: "POST",
  });
}

/** `POST /:id/qr/scan` — buyer confirms after scanning (Meetup). → Completed. */
export function scanQr(
  id: number,
  payload: ScanQrPayload,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/qr/scan`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `POST /:id/refund-slip` — seller records an off-platform refund. Evidence only. */
export function uploadRefundSlip(
  id: number,
  payload: UploadRefundSlipPayload,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/refund-slip`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `POST /:id/confirm-refund` — buyer acknowledges the refund arrived. Evidence only. */
export function confirmRefund(
  id: number,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/confirm-refund`, {
    ...opts,
    method: "POST",
  });
}

/** `POST /:id/cancel-request` — ask to cancel. From Pending cancels outright. */
export function requestCancellation(
  id: number,
  payload: RequestCancellationPayload,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/cancel-request`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `POST /:id/cancel-request/respond` — other party approves or rejects. */
export function respondToCancellation(
  id: number,
  payload: RespondCancellationPayload,
  opts?: RequestOptions,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}/cancel-request/respond`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

// ---- room: messages + appointment cards --------------------------------------

/** `GET /:id/message` — the room's message history, oldest first. */
export function getMessages(id: number, opts?: RequestOptions): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(`/transactions/${id}/message`, opts);
}

/** `POST /:id/message` — post a message and/or images to the room. */
export function sendMessage(
  id: number,
  payload: SendMessagePayload,
  opts?: RequestOptions,
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/transactions/${id}/message`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}

/** `POST /:id/appointment-cards` — propose a meetup date, time and place. */
export function createAppointment(
  id: number,
  payload: CreateAppointmentPayload,
  opts?: RequestOptions,
): Promise<AppointmentCard> {
  return apiFetch<AppointmentCard>(`/transactions/${id}/appointment-cards`, {
    ...opts,
    method: "POST",
    body: payload,
  });
}
