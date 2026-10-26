import { getGiveaways, getMyTicket } from "@/lib/api/giveaways";
import { getCurrentUserId } from "@/lib/api/session";
import type { GiveawayTicket } from "@/lib/api/types";

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

/**
 * Reads real data now (`getGiveaways`) instead of the static mock array
 * `lib/api/fixtures.ts` used to return, so this can no longer be prerendered
 * once at build time — a giveaway created after the build would never show
 * up, and a `next build` run without the backend reachable would fail the
 * whole build outright (as it did before this was added).
 */
export const dynamic = "force-dynamic";

export default async function GiveawayPage() {
  const viewerId = await getCurrentUserId();
  const giveaways = await getGiveaways();

  // Browsing is public, so there may be no viewer. There is no "my tickets"
  // endpoint either — when signed in, rebuild the list one giveaway at a time
  // (same bounded N+1 as rooms-query.ts / history).
  const tickets: GiveawayTicket[] = viewerId
    ? (
        await Promise.all(
          giveaways.map((giveaway) =>
            getMyTicket(giveaway.giveaway_id, giveaway, viewerId).catch(
              () => undefined,
            ),
          ),
        )
      ).filter((ticket): ticket is GiveawayTicket => ticket !== undefined)
    : [];

  return (
    <GiveawayBrowser
      giveaways={giveaways}
      tickets={tickets}
      viewerId={viewerId ?? null}
    />
  );
}
