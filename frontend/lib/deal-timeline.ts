/**
 * A deal's progress as a list of events, so the chat can show a summary card
 * at the point in the conversation where each step happened.
 *
 * Derived only from what the API already returns (the frontend adapts to the
 * backend). Most steps stamp a column; some do not:
 *
 *   dated     created_at, payment_confirmed_by_buyer_at,
 *             payment_confirmed_by_seller_at, appointment created_at,
 *             item_received_confirmed_by_buyer_at, cancellation_requested_at,
 *             refund_submitted_at, item_return_confirmed_at
 *   undated   tracking number entered, appointment confirmed, cancellation
 *             answered, refund acknowledged, return finished, report opened
 *
 * An undated event is placed right after the event before it in flow order,
 * and at the end of the chat when it is the latest step. Its card shows no
 * time, because there is none to show.
 *
 * Pure, no I/O.
 */

import type { AppointmentCardData, Transaction } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { requiresPayment, type Tone } from "@/lib/status";

export type DealEventKind =
  | "started"
  | "slip"
  | "paid"
  | "meetup-proposed"
  | "meetup-confirmed"
  | "meetup-closed"
  | "shipped"
  | "received"
  | "cancel-requested"
  | "cancel-answered"
  | "review"
  | "refund-slip"
  | "refund-received"
  | "item-returned"
  | "closed";

export interface DealEvent {
  /** Stable across polls, so React keeps the same card. */
  id: string;
  kind: DealEventKind;
  title: string;
  detail?: string;
  tone: Tone;
  /** ISO time, when the backend recorded one. */
  at?: string;
  /**
   * Where the card sits: epoch ms, inherited from the event before it for an
   * undated event, `Infinity` for an undated event that is the latest step.
   */
  placeAt: number;
}

const baht = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

/** Prefixed, because the card also shows when the proposal was made. */
function meetupWhen(card: AppointmentCardData): string {
  return `Meet ${formatDateTime(new Date(`${card.date}T${card.time}+07:00`))} · ${card.location}`;
}

export function buildDealTimeline(
  tx: Transaction,
  cards: AppointmentCardData[],
  viewerId: number,
): DealEvent[] {
  const name = (userId: number | null | undefined) =>
    userId === viewerId
      ? "You"
      : userId === tx.buyer_id
        ? tx.buyer.name
        : userId === tx.seller_id
          ? tx.seller.name
          : "Someone";
  const pays = requiresPayment(tx);
  const isTrade = tx.offer_id != null;

  // Built in flow order; `at` is filled only where a column records it.
  const events: Array<Omit<DealEvent, "placeAt">> = [];
  const push = (e: Omit<DealEvent, "placeAt">) => events.push(e);

  push({
    id: "started",
    kind: "started",
    title: isTrade ? "Trade agreed" : "Deal started",
    detail: pays ? `${tx.post.item.name} · ${baht(tx.final_amount)}` : tx.post.item.name,
    tone: "info",
    at: tx.created_at,
  });

  if (tx.payment_confirmed_by_buyer_at)
    push({
      id: "slip",
      kind: "slip",
      title: `${name(tx.buyer_id)} sent the payment slip`,
      detail: baht(tx.final_amount),
      tone: "info",
      at: tx.payment_confirmed_by_buyer_at,
    });

  if (tx.payment_confirmed_by_seller_at)
    push({
      id: "paid",
      kind: "paid",
      title: `${name(tx.seller_id)} confirmed the payment`,
      detail: `${baht(tx.final_amount)} received`,
      tone: "success",
      at: tx.payment_confirmed_by_seller_at,
    });

  const since = tx.cancellation_requested_at
    ? Date.parse(tx.cancellation_requested_at)
    : Infinity;
  const byCreation = [...cards].sort((a, b) => {
    const t = Date.parse(a.created_at) - Date.parse(b.created_at);
    return t !== 0 ? t : a.appointment_id - b.appointment_id;
  });
  const meetupEvents = (list: AppointmentCardData[], noun: string) => {
    for (const card of list) {
      push({
        id: `meetup-${card.appointment_id}`,
        kind: "meetup-proposed",
        title: `${name(card.proposed_by)} proposed a ${noun}`,
        detail: meetupWhen(card),
        tone: "warning",
        at: card.created_at,
      });
      // A superseded Confirmed card keeps its status, so this still happened.
      if (card.status === "Confirmed")
        push({
          id: `meetup-${card.appointment_id}-confirmed`,
          kind: "meetup-confirmed",
          title: `${noun[0].toUpperCase()}${noun.slice(1)} confirmed`,
          detail: meetupWhen(card),
          tone: "success",
        });
      // Rejected covers both a declined card and a Pending one replaced by a
      // newer proposal (createAppointment); the backend records the same
      // thing for both, and in both the proposal was not accepted.
      if (card.status === "Rejected")
        push({
          id: `meetup-${card.appointment_id}-closed`,
          kind: "meetup-closed",
          title: `${noun[0].toUpperCase()}${noun.slice(1)} proposal not accepted`,
          detail: meetupWhen(card),
          tone: "neutral",
          at: card.deleted_at ?? undefined,
        });
    }
  };
  meetupEvents(byCreation.filter((c) => Date.parse(c.created_at) < since), "meetup");

  if (tx.tracking_number)
    push({
      id: "shipped",
      kind: "shipped",
      title: `${name(tx.seller_id)} shipped the item`,
      detail: tx.estimated_delivery_date
        ? `${tx.tracking_number} · due ${formatDate(tx.estimated_delivery_date)}`
        : tx.tracking_number,
      tone: "info",
    });

  // Where the item changed hands: the handover card that was live at the
  // time (the newest Confirmed one made before any return request).
  const handoverCard = byCreation
    .filter((c) => c.status === "Confirmed" && Date.parse(c.created_at) < since)
    .at(-1);
  if (tx.item_received_confirmed_by_buyer_at)
    // Handover needs the payment confirmed first (backend `ship` and
    // `assertHandoverReady`), so receiving the item is what completes a deal.
    push({
      id: "received",
      kind: "received",
      title:
        tx.delivery_method === "Shipping"
          ? `${name(tx.buyer_id)} received the parcel · deal completed`
          : "Item handed over · deal completed",
      detail:
        tx.delivery_method === "Shipping"
          ? (tx.tracking_number ?? undefined)
          : handoverCard
            ? `At ${handoverCard.location}`
            : undefined,
      tone: "success",
      at: tx.item_received_confirmed_by_buyer_at,
    });

  let cancelledOnTheSpot = false;
  if (tx.cancellation_requested_at) {
    const isReturn = !!tx.item_received_confirmed_by_buyer_at;
    // Only a still-Pending deal cancels on the spot, and that is recorded as
    // Approved in the same write as the request.
    const immediate =
      tx.status === "Cancelled" &&
      tx.cancellation_response === "Approved" &&
      !tx.payment_confirmed_by_buyer_at &&
      !isReturn;
    cancelledOnTheSpot = immediate;
    push({
      id: "cancel-requested",
      kind: "cancel-requested",
      title: immediate
        ? `${name(tx.cancellation_requested_by)} cancelled the deal`
        : `${name(tx.cancellation_requested_by)} asked for a ${isReturn ? "return" : "cancellation"}`,
      detail: tx.cancellation_reason ?? undefined,
      tone: immediate ? "danger" : "warning",
      at: tx.cancellation_requested_at,
    });
    // The other party is the only one who can answer (respondToCancellation).
    const responder =
      tx.cancellation_requested_by === tx.buyer_id ? tx.seller_id : tx.buyer_id;
    const noun = isReturn ? "return" : "cancellation";
    if (!immediate && tx.cancellation_response === "Approved")
      push({
        id: "cancel-answered",
        kind: "cancel-answered",
        title: `${name(responder)} accepted the ${noun}`,
        detail: tx.payment_confirmed_by_buyer_at
          ? isReturn
            ? "Refund and item return next"
            : "Refund next"
          : undefined,
        tone: "warning",
      });
    if (tx.cancellation_response === "Rejected")
      push({
        id: "cancel-answered",
        kind: "cancel-answered",
        // A deadline that ran out also records Rejected, so do not claim the
        // other party pressed a button.
        title: `${noun[0].toUpperCase()}${noun.slice(1)} not accepted · sent to an admin`,
        detail: "Actions are locked until an admin decides",
        tone: "danger",
      });
  }

  // An open report that no cancellation explains — a payment or delivery
  // deadline ran out (transaction-deadline.service.ts). A timed-out
  // cancellation marks itself Rejected, and is covered above.
  if (tx.active_report_id && !tx.cancellation_response)
    push({
      id: `review-${tx.active_report_id}`,
      kind: "review",
      title: "Sent to admin review · actions locked",
      tone: "danger",
    });

  meetupEvents(byCreation.filter((c) => Date.parse(c.created_at) >= since), "return meetup");

  if (tx.refund_submitted_at)
    push({
      id: "refund-slip",
      kind: "refund-slip",
      title: `${name(tx.seller_id)} sent the refund slip`,
      detail: baht(tx.final_amount),
      tone: "info",
      at: tx.refund_submitted_at,
    });

  if (tx.refund_confirmed_by_buyer)
    push({
      id: "refund-received",
      kind: "refund-received",
      title: `${name(tx.buyer_id)} confirmed the refund`,
      tone: "success",
    });

  if (tx.item_return_confirmed_at)
    push({
      id: "item-returned",
      kind: "item-returned",
      title: "Item returned",
      tone: "success",
      at: tx.item_return_confirmed_at,
    });

  if (tx.status === "Refunded")
    push({ id: "closed", kind: "closed", title: "Return complete · deal closed", tone: "neutral" });
  else if (tx.status === "Cancelled" && !cancelledOnTheSpot)
    push({ id: "closed", kind: "closed", title: "Deal cancelled", tone: "danger" });

  // Placement: dated events at their own time; an undated one inherits the
  // time of the event before it in flow order, except the latest step, which
  // belongs at the end. A stable sort then puts parallel steps (a meetup
  // proposed before the seller confirmed the slip) in real order while an
  // undated step stays right behind the step it follows.
  // Nothing sits above "Deal started": every step happens after the deal
  // exists, so an earlier stamp is bad data (the seed has some), not history.
  const start = Date.parse(tx.created_at);
  let previous = start;
  const placed = events.map((e, i) => {
    const placeAt = e.at
      ? Math.max(Date.parse(e.at), start)
      : i === events.length - 1
        ? Infinity
        : previous;
    if (Number.isFinite(placeAt)) previous = placeAt;
    return { ...e, placeAt };
  });
  return placed
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.placeAt - b.e.placeAt || a.i - b.i)
    .map(({ e }) => e);
}
