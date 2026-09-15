/**
 * "What is waiting on you" — the Home surface (IA decision D2, research risk R4 and
 * persona P2).
 *
 * Everything here is derived client-side from `/transactions` and
 * `/posts/{id}/offers` plus the timestamp columns the schema already has.
 * There is no new endpoint, and there must not be: the backend is fixed.
 *
 * One derivation, used by both the Home list and the nav badges, so the two
 * can never disagree (docs/design/ia.md §7).
 */

import type { Offer, Transaction } from "@/lib/api/types";
import {
  cancelResponseDeadline,
  resolveTransactionActor,
  sellerConfirmDeadline,
  shippingDeadline,
  type ActorPrompt,
  type Deadline,
  type Party,
} from "@/lib/status";

export interface InboxEntry {
  kind: "transaction" | "offer";
  id: number;
  href: string;
  title: string;
  prompt: ActorPrompt;
  /** The clock attached to this entry, if the flow puts one on it. */
  deadline?: Deadline;
  counterparty: string;
  amount?: number;
}

export interface Inbox {
  /** The viewer must act. Sorted by urgency, soonest deadline first. */
  yours: InboxEntry[];
  /** Waiting on the other person, with the clock visible so it is not silent. */
  theirs: InboxEntry[];
  /** Offers awaiting an answer, either direction (research R6). */
  offers: Offer[];
}

function partyOf(tx: Transaction, viewerId: number): Party {
  return tx.buyer_id === viewerId ? "buyer" : "seller";
}

/**
 * The clock the flow attaches to this transaction right now, if any.
 * Only one is live at a time — they belong to different steps.
 */
export function deadlineFor(tx: Transaction): Deadline | undefined {
  if (tx.active_report_id) return undefined;
  if (tx.cancellation_response === "Pending" && tx.cancellation_requested_at) {
    if (tx.status === "Completed") return {
      kind: "return-response", expiresAt: new Date(tx.cancellation_requested_at).getTime() + 24 * 3600000,
      labelKey: "deadline.return-response.label", onExpiry: "escalate",
    };
    return cancelResponseDeadline(tx.cancellation_requested_at);
  }
  if ((tx.status === "Pending Refund" || tx.status === "Cancelled") && tx.refund_submitted_at && !tx.refund_confirmed_by_buyer) return {
    kind: "refund-confirmation",
    expiresAt: new Date(tx.refund_submitted_at).getTime() + (tx.item_received_confirmed_by_buyer_at ? 72 : 24) * 3600000,
    labelKey: "deadline.refund-confirmation.label", onExpiry: "escalate",
  };
  // Seller has 24h to confirm the slip. `uploadPaymentSlip`
  // (transaction.service.ts) sets `payment_confirmed_by_buyer_at` and moves
  // `status` to `Processing` in the same write, so "Pending with a buyer
  // payment timestamp already on it" can never actually occur — this used to
  // check that combination and so never fired for a real transaction.
  if (
    tx.status === "Processing" &&
    tx.payment_confirmed_by_buyer_at &&
    !tx.payment_confirmed_by_seller_at
  ) {
    return sellerConfirmDeadline(tx.payment_confirmed_by_buyer_at);
  }
  if (
    tx.status === "Processing" &&
    tx.delivery_method === "Shipping" &&
    tx.estimated_delivery_date
  ) {
    return shippingDeadline(tx.estimated_delivery_date);
  }
  return undefined;
}

export function buildInbox(
  transactions: Transaction[],
  offers: Offer[],
  viewerId: number,
): Inbox {
  const yours: InboxEntry[] = [];
  const theirs: InboxEntry[] = [];

  for (const tx of transactions) {
    const viewer = partyOf(tx, viewerId);
    const prompt = resolveTransactionActor(tx, viewer);
    if (prompt.actor === null) continue; // terminal, nothing to chase

    const entry: InboxEntry = {
      kind: "transaction",
      id: tx.transaction_id,
      href: `/history/${tx.transaction_id}`,
      title: tx.post.item.name,
      prompt,
      deadline: deadlineFor(tx),
      counterparty: viewer === "buyer" ? tx.seller.name : tx.buyer.name,
      amount: tx.final_amount,
    };

    (prompt.actor === viewer ? yours : theirs).push(entry);
  }

  // Soonest deadline first; entries without one fall to the back. An entry
  // with three hours left must not sit below one with three days.
  const byUrgency = (a: InboxEntry, b: InboxEntry) =>
    (a.deadline?.expiresAt ?? Infinity) - (b.deadline?.expiresAt ?? Infinity);

  yours.sort(byUrgency);
  theirs.sort(byUrgency);

  const pendingOffers = offers.filter((o) => o.status === "Pending");

  return { yours, theirs, offers: pendingOffers };
}

/** Feeds the Home and Deals badges. One number, one source. */
export function actionCount(inbox: Inbox): number {
  return inbox.yours.length;
}

export function offersNeedingAnswer(offers: Offer[], viewerId: number): number {
  // Offers made *to* the viewer are the ones that need an answer; the viewer's
  // own pending offers are just waiting.
  return offers.filter(
    (o) => o.status === "Pending" && o.post.seller.user_id === viewerId,
  ).length;
}
