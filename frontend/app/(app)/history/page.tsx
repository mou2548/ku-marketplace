import { formatDate } from "@/lib/date-format";
import { redirect } from "next/navigation";

import { getGiveaways, getMyTicket } from "@/lib/api/giveaways";
import { getCurrentUserId } from "@/lib/api/session";
import { getTransactions } from "@/lib/api/transactions";
import type { GiveawayTicket } from "@/lib/api/types";

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

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const viewerId = await getCurrentUserId();
  if (!viewerId) redirect("/login");
  const { status } = await searchParams;

  const [transactions, giveaways] = await Promise.all([
    getTransactions(),
    getGiveaways(),
  ]);

  // There is no "my tickets" endpoint — check each giveaway for the viewer's
  // ticket. The full roster keeps forfeited, expired, and not-selected history
  // visible instead of silently dropping those outcomes.
  const tickets = (
    await Promise.all(
      giveaways.map((giveaway) =>
        getMyTicket(giveaway.giveaway_id, giveaway, viewerId).catch(
          () => undefined,
        ),
      ),
    )
  ).filter((ticket): ticket is GiveawayTicket => ticket !== undefined);

  return (
    <HistoryList
      transactions={transactions.map((transaction) => ({
        ...transaction,
        // Reuse the server's text during hydration; browser ICU data can differ.
        created_date_label: formatDate(transaction.created_at),
      }))}
      tickets={tickets}
      viewerId={viewerId}
      initialStatus={typeof status === "string" ? status : undefined}
      // A new ?status= on the same route (the tab bar, another shortcut)
      // remounts the list so its filter follows the URL.
      key={typeof status === "string" ? status : "all"}
    />
  );
}
