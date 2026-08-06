import { notFound } from "next/navigation";

import { ModalShell } from "@/components/modal-shell";
import { OfferReview } from "@/components/offer-review";
import { getOffer } from "@/lib/offers";

/**
 * Server component so the modal shows the same offer data — and the same §3.3
 * acceptance fallout — as the full page it intercepts.
 */
export default async function OfferAlertModal({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const offer = getOffer(offerId);

  if (!offer) notFound();

  return (
    <ModalShell title={`ข้อเสนอจาก ${offer.fromName}`}>
      <OfferReview offer={offer} />
    </ModalShell>
  );
}
