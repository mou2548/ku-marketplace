import { redirect } from "next/navigation";

import { getMyOffers } from "@/lib/api/offers";
import { getCurrentUserId } from "@/lib/api/session";

import { OffersInbox } from "./offers-inbox";

/**
 * E4 — the offer inbox. Research risk R6.
 *
 * The old app had no destination for an offer after it was sent: a trader made
 * four offers and had nowhere to see them. Now it is a first-class tab with
 * both directions split, because "what did I offer" and "what was offered to
 * me" carry completely different actions.
 *
 * Real data via `GET /offers` (both directions in one call), so it cannot be
 * prerendered.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Offers - KU Marketplace" };

export default async function OffersPage() {
  const viewerId = await getCurrentUserId();
  if (!viewerId) redirect("/login");

  const offers = await getMyOffers();
  return <OffersInbox offers={offers} viewerId={viewerId} />;
}
