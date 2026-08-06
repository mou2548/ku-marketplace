import { notFound } from "next/navigation";

import { OfferReview } from "@/components/offer-review";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { getOffer } from "@/lib/offers";

export default async function OfferAlertPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const offer = getOffer(offerId);

  if (!offer) notFound();

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-[480px] flex-col gap-6 rounded-3xl p-8 shadow-elevated ring-0">
          <OfferReview offer={offer} />
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
