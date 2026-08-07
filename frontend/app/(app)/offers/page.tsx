import { getOffers, VIEWER_ID } from "@/lib/api/fixtures";

import { OffersInbox } from "./offers-inbox";

/**
 * E4 — the offer inbox. Research risk R6.
 *
 * The old app had no destination for an offer after it was sent: a trader made
 * four offers and had nowhere to see them. Now it is a first-class tab with
 * both directions split, because "what did I offer" and "what was offered to
 * me" carry completely different actions.
 */
export const metadata = { title: "Offers - KU Marketplace" };

export default async function OffersPage() {
  const offers = await getOffers();
  return <OffersInbox offers={offers} viewerId={VIEWER_ID} />;
}
