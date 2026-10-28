/**
 * The one-glance version of a deal, for the inbox row.
 *
 * The inbox used to show only the raw `Transaction.status` badge, and that
 * enum is too coarse to answer what people actually open a chat to check:
 * `Processing` covers "slip uploaded, seller has not looked", "paid, no meetup
 * yet", "meetup on Friday" and "parcel in the post". Everything below is
 * derived from columns the API already returns plus the `Appointment_Card`
 * rows, so it needs no new endpoint.
 *
 * Every branch mirrors a guard in `backend/src/transaction/transaction.service.ts`
 * or `backend/src/transactions/transactions.service.ts` (createAppointment),
 * so the row never promises a step the backend would refuse:
 *
 *   - an open report (`active_report_id`) locks every confirm endpoint;
 *   - a pending cancellation/return request locks them too, until answered;
 *   - a paid deal is `Pending` until the slip is uploaded, then `Processing`;
 *     the seller must confirm the money before shipping or a QR handover;
 *   - a cash-free trade stays `Pending` and goes straight to the meetup;
 *   - a meetup handover needs the current (newest non-retired) card Confirmed;
 *   - a return needs the refund slip confirmed (if money moved) and the item
 *     scanned back (if it was handed over); a sale's return needs a new
 *     appointment made after the request, a trade's does not.
 *
 * Pure, no I/O: `lib/rooms.ts` calls it on the server and the result is plain
 * strings, so the client row only renders it.
 */

import type { AppointmentCardData, Transaction } from "@/lib/api/types";
import { deriveAppointmentView } from "@/lib/appointment";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { isSlipRejected } from "@/lib/slip-state";
import { requiresPayment, type Party, type Tone } from "@/lib/status";

export { isSlipRejected };

export type DealFactKind =
  | "payment"
  | "meetup"
  | "shipping"
  | "refund"
  | "return";

export interface DealFact {
  kind: DealFactKind;
  label: string;
  tone: Tone;
  done: boolean;
}

export interface DealProgress {
  /** The step the deal is on right now, in one sentence. */
  headline: string;
  tone: Tone;
  /**
   * Who has to move next. `both` means either side may (proposing a meetup
   * time); `null` means nobody — the deal is over or an admin holds it.
   */
  waitingOn: "you" | "them" | "both" | null;
  /** Payment and handover state, shown under the headline. */
  facts: DealFact[];
}


/** Day-first Bangkok time — same rendering as the pinned card in the room. */
function appointmentWhen(card: AppointmentCardData): string {
  return formatDateTime(new Date(`${card.date}T${card.time}+07:00`));
}

export function describeDeal(
  tx: Transaction,
  viewerId: number,
  /** `undefined` when the cards could not be loaded — never guessed as "none". */
  cards: AppointmentCardData[] | undefined,
): DealProgress {
  const viewer: Party = tx.buyer_id === viewerId ? "buyer" : "seller";
  const other = viewer === "buyer" ? tx.seller.name : tx.buyer.name;
  const who = (party: Party): "you" | "them" => (party === viewer ? "you" : "them");
  const pays = requiresPayment(tx);

  const paymentFact = (): DealFact | undefined => {
    if (!pays) return undefined;
    if (tx.payment_confirmed_by_seller_at)
      return { kind: "payment", label: "Payment confirmed by seller", tone: "success", done: true };
    if (isSlipRejected(tx) && tx.refund_slip_url)
      return { kind: "payment", label: "Slip rejected · refund sent, not confirmed yet", tone: "warning", done: false };
    if (isSlipRejected(tx))
      return { kind: "payment", label: "Slip rejected · new slip needed", tone: "danger", done: false };
    if (tx.payment_confirmed_by_buyer_at)
      return {
        kind: "payment",
        label: `Slip sent ${formatDate(tx.payment_confirmed_by_buyer_at)} · not confirmed yet`,
        tone: "warning",
        done: false,
      };
    return { kind: "payment", label: "Not paid yet", tone: "warning", done: false };
  };

  const meetupFact = (
    current: AppointmentCardData | undefined,
    noun: string,
  ): DealFact => {
    if (current?.status === "Confirmed")
      return {
        kind: "meetup",
        label: `${noun} ${appointmentWhen(current)} · ${current.location}`,
        tone: "success",
        done: true,
      };
    if (current?.status === "Pending")
      return {
        kind: "meetup",
        label: `Proposed ${appointmentWhen(current)} · ${current.location} · not accepted yet`,
        tone: "warning",
        done: false,
      };
    return { kind: "meetup", label: `No ${noun.toLowerCase()} time agreed yet`, tone: "neutral", done: false };
  };

  const handoverFact = (current: AppointmentCardData | undefined): DealFact | undefined => {
    if (tx.delivery_method === "Shipping") {
      if (tx.item_received_confirmed_by_buyer_at)
        return {
          kind: "shipping",
          label: `Delivered ${formatDate(tx.item_received_confirmed_by_buyer_at)}`,
          tone: "success",
          done: true,
        };
      if (tx.tracking_number)
        return {
          kind: "shipping",
          label: tx.estimated_delivery_date
            ? `Shipped · ${tx.tracking_number} · due ${formatDate(tx.estimated_delivery_date)}`
            : `Shipped · ${tx.tracking_number}`,
          tone: "info",
          done: false,
        };
      return { kind: "shipping", label: "Not shipped yet", tone: "neutral", done: false };
    }
    if (tx.item_received_confirmed_by_buyer_at)
      return {
        kind: "meetup",
        label: `Handed over ${formatDate(tx.item_received_confirmed_by_buyer_at)}`,
        tone: "success",
        done: true,
      };
    return cards ? meetupFact(current, "Meetup") : undefined;
  };

  const compact = (facts: Array<DealFact | undefined>) =>
    facts.filter((f): f is DealFact => f !== undefined);

  /* ---------------- terminal states ---------------- */

  if (tx.status === "Completed" && !tx.active_report_id && tx.cancellation_response !== "Pending") {
    return {
      headline: tx.item_received_confirmed_by_buyer_at
        ? `Completed ${formatDate(tx.item_received_confirmed_by_buyer_at)}`
        : "Completed",
      tone: "success",
      waitingOn: null,
      facts: [],
    };
  }

  if (tx.status === "Refunded") {
    return { headline: "Returned and refunded", tone: "neutral", waitingOn: null, facts: [] };
  }

  // `Cancelled` with money still owed is handled as a refund below, the same
  // way the room's action card treats it.
  const refundOwedOnCancelled =
    tx.status === "Cancelled" &&
    !!tx.payment_confirmed_by_buyer_at &&
    !tx.refund_confirmed_by_buyer;

  if (tx.status === "Cancelled" && !refundOwedOnCancelled && !tx.active_report_id) {
    const by = tx.cancellation_requested_by;
    return {
      headline:
        by == null ? "Cancelled" : by === viewerId ? "Cancelled by you" : `Cancelled by ${other}`,
      tone: "danger",
      waitingOn: null,
      facts: [],
    };
  }

  const liveCards = cards ?? [];
  const handoverCard = deriveAppointmentView(liveCards).current;

  /* ---------------- locked: admin review ---------------- */

  if (tx.active_report_id) {
    return {
      headline: "Under admin review · actions locked",
      tone: "danger",
      waitingOn: null,
      facts: compact([paymentFact(), handoverFact(handoverCard)]),
    };
  }

  /* ---------------- locked: cancellation / return request ---------------- */

  if (tx.cancellation_response === "Pending") {
    const isReturn = tx.status === "Completed";
    const noun = isReturn ? "return" : "cancellation";
    const mine = tx.cancellation_requested_by === viewerId;
    return {
      headline: mine
        ? `You asked for a ${noun} · waiting for ${other} to answer`
        : `${other} asked for a ${noun} · your answer needed`,
      tone: "warning",
      waitingOn: mine ? "them" : "you",
      facts: isReturn ? [] : compact([paymentFact(), handoverFact(handoverCard)]),
    };
  }

  /* ---------------- return and refund ---------------- */

  if (tx.status === "Pending Refund" || refundOwedOnCancelled) {
    const facts: DealFact[] = [];
    const actions: string[] = [];
    let youAct = false;
    let theyAct = false;

    if (tx.payment_confirmed_by_buyer_at) {
      if (tx.refund_confirmed_by_buyer) {
        facts.push({ kind: "refund", label: "Refund received", tone: "success", done: true });
      } else if (tx.refund_slip_url) {
        facts.push({
          kind: "refund",
          label: tx.refund_submitted_at
            ? `Refund slip sent ${formatDate(tx.refund_submitted_at)} · not confirmed yet`
            : "Refund slip sent · not confirmed yet",
          tone: "warning",
          done: false,
        });
        if (viewer === "buyer") {
          youAct = true;
          actions.push("confirm the refund");
        } else theyAct = true;
      } else {
        facts.push({ kind: "refund", label: "Refund not sent yet", tone: "warning", done: false });
        if (viewer === "seller") {
          youAct = true;
          actions.push("send the refund slip");
        } else theyAct = true;
      }
    }

    const itemOut =
      !!tx.item_received_confirmed_by_buyer_at && tx.status === "Pending Refund";
    if (itemOut) {
      if (tx.item_return_confirmed_at) {
        facts.push({
          kind: "return",
          label: `Item returned ${formatDate(tx.item_return_confirmed_at)}`,
          tone: "success",
          done: true,
        });
      } else {
        // Only cards made after the request count — the old handover card is
        // still live, and the backend refuses it for the return QR.
        const since = tx.cancellation_requested_at
          ? Date.parse(tx.cancellation_requested_at)
          : Infinity;
        const returnCard = deriveAppointmentView(
          liveCards.filter((c) => Date.parse(c.created_at) >= since),
        ).current;
        const needsAppointment = tx.offer_id == null;
        if (needsAppointment && !cards) {
          facts.push({ kind: "return", label: "Item not returned yet", tone: "warning", done: false });
        } else if (needsAppointment && returnCard?.status !== "Confirmed") {
          facts.push({ ...meetupFact(returnCard, "Return meetup"), kind: "return" });
          if (returnCard?.status === "Pending") {
            if (returnCard.proposed_by === viewerId) theyAct = true;
            else {
              youAct = true;
              actions.push("answer the return meetup");
            }
          } else {
            // Either side may propose; the backend only checks participation.
            youAct = true;
            actions.push("agree a return meetup");
          }
        } else {
          facts.push({
            kind: "return",
            label:
              returnCard?.status === "Confirmed"
                ? `Return ${appointmentWhen(returnCard)} · ${returnCard.location}`
                : "Item not returned yet",
            tone: "warning",
            done: false,
          });
          // Both sides take part in the return scan: one shows, one scans.
          youAct = true;
          actions.push(
            tx.cancellation_requested_by === viewerId
              ? "scan the return QR"
              : "show the return QR",
          );
        }
      }
    }

    return {
      headline: actions.length
        ? `Return in progress · you need to ${actions.join(" and ")}`
        : theyAct
          ? `Return in progress · waiting for ${other}`
          : "Return in progress",
      tone: "warning",
      waitingOn: youAct ? "you" : theyAct ? "them" : null,
      facts,
    };
  }

  /* ---------------- normal flow: Pending / Processing ---------------- */

  const facts = compact([paymentFact(), handoverFact(handoverCard)]);
  const step = (
    actor: Party | "both",
    mine: string,
    theirs: string,
    tone: Tone = "warning",
  ): DealProgress => {
    const waitingOn = actor === "both" ? "both" : who(actor);
    return { headline: waitingOn === "them" ? theirs : mine, tone, waitingOn, facts };
  };

  if (pays && !tx.payment_confirmed_by_buyer_at)
    return step("buyer", "Transfer the money and upload the slip", `Waiting for ${other} to pay`);

  // The seller returned what arrived: the buyer confirms it before anything
  // else, and the API refuses a new slip until they do.
  if (pays && isSlipRejected(tx) && tx.refund_slip_url)
    return step("buyer", "The seller sent a refund · confirm it reached you", `Waiting for ${other} to confirm the refund`);

  if (pays && isSlipRejected(tx))
    return step("buyer", "The seller rejected your slip · upload a new one", `Waiting for ${other} to send a new slip`);

  if (pays && !tx.payment_confirmed_by_seller_at)
    return step("seller", "Check the slip and confirm the payment", `Waiting for ${other} to confirm the payment`);

  if (tx.delivery_method === "Shipping") {
    if (!tx.tracking_number)
      return step("seller", "Ship the item and add the tracking number", `Waiting for ${other} to ship`, "info");
    return step("buyer", "Confirm when the parcel arrives", `Waiting for ${other} to confirm delivery`, "info");
  }

  if (!cards) {
    return { headline: "Meetup handover · open the chat for details", tone: "info", waitingOn: null, facts };
  }
  if (!handoverCard) return step("both", "Propose a meetup time and place", "Propose a meetup time and place");
  if (handoverCard.status === "Pending") {
    return handoverCard.proposed_by === viewerId
      ? { headline: `Waiting for ${other} to accept the meetup`, tone: "warning", waitingOn: "them", facts }
      : { headline: "Accept the proposed meetup or suggest another time", tone: "warning", waitingOn: "you", facts };
  }
  return step("buyer", "At the meetup, scan the seller's QR", `At the meetup, show ${other} your QR`, "info");
}
