import { getMyTickets, getTransactions, VIEWER_ID } from "@/lib/api/fixtures";

import { HistoryList } from "./history-list";

/**
 * E8 — history in one place.
 *
 * The old app had `/chat`, `/history`, and `/trade/[id]` as three unrelated
 * destinations for the same objects. History is not a place; it is a filter on
 * status. Buyer/seller is a filter too, not an app mode (IA decision D3): the
 * same student is both in the same week, and a global toggle would hide half
 * their obligations at any moment.
 *
 * Revised 2026-08-07: a giveaway you entered is a commitment with a progress
 * state exactly like a purchase, and it was previously only visible on the
 * giveaway page, so it lands here too. Offers went the other way — they were
 * duplicated from `/offers` and are now only there, because an offer is not a
 * deal until it is accepted.
 */
export const metadata = { title: "History - KU Marketplace" };

export default async function DealsPage() {
  const [transactions, tickets] = await Promise.all([
    getTransactions(),
    getMyTickets(),
  ]);

  return (
    <HistoryList
      transactions={transactions}
      tickets={tickets}
      viewerId={VIEWER_ID}
    />
  );
}
