import { notFound, redirect } from "next/navigation";

import { getMyOffers } from "@/lib/api/offers";
import { getCurrentUserId } from "@/lib/api/session";

import { OfferReview } from "./offer-review";

/**
 * E4 — an offer, shown on the bench. Design principle 6: a trade is a
 * comparison, not a form. The post owner has to answer "am I getting the
 * better end of this?" and the only way to answer it fast is to see both
 * stacks facing each other with the cash gap in the middle.
 *
 * There is no `GET /offers/:id`; the offer is picked out of the viewer's own
 * `GET /offers` list, which already carries the full item + party detail.
 */
export default async function OfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const viewerId = await getCurrentUserId();
  if (!viewerId) redirect("/login");

  const offers = await getMyOffers();
  const offer = offers.find((o) => o.offer_id === Number(offerId));
  if (!offer) notFound();

  return <OfferReview offer={offer} viewerId={viewerId} />;
}
