import { getGiveaways, getMyTickets } from "@/lib/api/fixtures";

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

  return <GiveawayBrowser giveaways={giveaways} tickets={tickets} />;
}
