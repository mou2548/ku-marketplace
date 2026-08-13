import { getGiveaways, getMyTickets, getQueuePosition } from "@/lib/api/fixtures";

import { GiveawayBrowser } from "./giveaway-browser";

/**
 * E7 — giveaways.
 *
 * Research risk R7: registering then waiting has no shape. The allocation
 * method changes what waiting even means — FirstCome rewards speed, Random
 * rewards nothing, Manual depends on a human — so the method and the draw time
 * are stated on the card *before* anyone registers, not discovered afterwards.
 */
export const metadata = { title: "Giveaways - KU Marketplace" };

export default async function GiveawayPage() {
  const [giveaways, tickets] = await Promise.all([
    getGiveaways(),
    getMyTickets(),
  ]);

  // R7 follow-up: FirstCome entrants who are still waiting on the draw could
  // only see a headcount, not where they stood in it. Queue position is
  // derived the same way the manage screen derives entrant status — see
  // `getQueuePosition`.
  const queuePositions = new Map<number, number>();
  await Promise.all(
    tickets
      .filter(
        (t) =>
          t.status === "Registered" &&
          t.giveaway.allocation_method === "FirstCome",
      )
      .map(async (t) => {
        const position = await getQueuePosition(t.giveaway_id, t.receiver_id);
        if (position !== undefined) queuePositions.set(t.ticket_id, position);
      }),
  );

  return (
    <GiveawayBrowser
      giveaways={giveaways}
      tickets={tickets}
      queuePositions={queuePositions}
    />
  );
}
