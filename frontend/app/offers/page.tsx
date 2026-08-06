import { Inbox } from "lucide-react";

import { OfferCard } from "@/components/offer-card";
import { OffersTabs } from "@/components/offers-tabs";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { CURRENT_USER_ID } from "@/lib/items";
import { offersReceivedBy, offersSentBy } from "@/lib/offers";

/**
 * §3.3 — the queue of offers waiting on a decision. Until now a single offer
 * was reachable only from a notification, so anything missed was lost.
 */
function EmptyState({ message }: { message: string }) {
  return (
    <Card className="flex-col items-center gap-3 rounded-3xl p-8 py-16 text-center ring-0">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}

export default function OffersPage() {
  const received = offersReceivedBy(CURRENT_USER_ID);
  const sent = offersSentBy(CURRENT_USER_ID);

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 py-8">
        <PageHeader
          title="ข้อเสนอแลกเปลี่ยน"
          subtitle="ข้อเสนอที่รอคุณตัดสินใจ และข้อเสนอที่คุณยื่นไว้กับโพสต์ของคนอื่น"
        />

        <OffersTabs
          receivedCount={received.filter((offer) => offer.status === "pending").length}
          sentCount={sent.filter((offer) => offer.status === "pending").length}
          received={
            received.length > 0 ? (
              received.map((offer) => (
                <OfferCard key={offer.id} offer={offer} direction="received" />
              ))
            ) : (
              <EmptyState message="ยังไม่มีใครยื่นข้อเสนอกับโพสต์ของคุณ" />
            )
          }
          sent={
            sent.length > 0 ? (
              sent.map((offer) => (
                <OfferCard key={offer.id} offer={offer} direction="sent" />
              ))
            ) : (
              <EmptyState message="คุณยังไม่ได้ยื่นข้อเสนอกับโพสต์ไหน" />
            )
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
