import {
  getMyTickets,
  getOffers,
  getTransactions,
  VIEWER_ID,
} from "@/lib/api/fixtures";

import { DealsList } from "./deals-list";

/**
 * E8 — deals and history in one place.
 *
 * The old app had `/chat`, `/history`, and `/trade/[id]` as three unrelated
 * destinations for the same objects. History is not a place; it is a filter on
 * status. Buyer/seller is a filter too, not an app mode (IA decision D3): the
 * same student is both in the same week, and a global toggle would hide half
 * their obligations at any moment.
 *
 * Revised 2026-08-07: a giveaway you entered is a commitment with a progress
 * state exactly like a purchase, and it was previously only visible on the
 * giveaway page. Everything a student has going on now lands here — purchases,
 * trades, offers, and giveaway entries — because "where do I see all my
 * activity" should have one answer.
 */
export const metadata = { title: "Deals - KU Marketplace" };

export default async function DealsPage() {
  const [transactions, offers, tickets] = await Promise.all([
    getTransactions(),
    getOffers(),
    getMyTickets(),
  ]);

  return (
    <DealsList
      transactions={transactions}
      offers={offers}
      tickets={tickets}
      viewerId={VIEWER_ID}
    />
  );
}
