import { notFound } from "next/navigation";

import { getOffers, VIEWER_ID } from "@/lib/api/fixtures";

import { OfferReview } from "./offer-review";

/**
 * E4 — an offer, shown on the bench. Design principle 6: a trade is a
 * comparison, not a form. The post owner has to answer "am I getting the
 * better end of this?" and the only way to answer it fast is to see both
 * stacks facing each other with the cash gap in the middle.
 */
export default async function OfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const offers = await getOffers();
  const offer = offers.find((o) => o.offer_id === Number(offerId));
  if (!offer) notFound();

  const isOwner = offer.post.seller.user_id === VIEWER_ID;
  return <OfferReview offer={offer} isOwner={isOwner} />;
}
