"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin, Truck, Undo2, X } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { StatusBadge } from "@/components/kit/status-badge";
import { TradeBench } from "@/components/kit/trade-bench";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import type { Offer } from "@/lib/api/types";
import type { DeliveryMethod } from "@/lib/status";
import { OFFER_STATUS } from "@/lib/status";

export function OfferReview({
  offer,
  isOwner,
}: {
  offer: Offer;
  isOwner: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = useState<DeliveryMethod>("Meetup");
  const [busy, setBusy] = useState(false);

  const pending = offer.status === "Pending";
  const offered = offer.items.map((i) => ({
    item_id: i.item_id,
    name: i.name,
    quantity: i.quantity,
    condition: i.condition,
    category: i.category,
    image_url: i.images[0]?.image_url ?? null,
  }));
  const wanted = [
    {
      item_id: offer.post.item.item_id,
      name: offer.post.item.name,
      quantity: 1,
      condition: offer.post.item.condition,
      category: offer.post.item.category,
      image_url: offer.post.item.images[0]?.image_url ?? null,
    },
  ];

  async function respond(message: string, next?: string) {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(message);
    router.push(next ?? "/offers");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
            {isOwner ? "Someone offered you a trade" : "Your offer"}
          </h1>
          <p className="text-[0.875rem] text-ink-muted">
            Post: {offer.post.item.name}
          </p>
        </div>
        <StatusBadge status={OFFER_STATUS[offer.status]} />
      </header>

      <TrustBadge
        name={isOwner ? offer.proposer.name : offer.post.seller.name}
        isVerified={isOwner ? offer.proposer.isVerified : offer.post.seller.isVerified}
        faculty={isOwner ? offer.proposer.faculty : offer.post.seller.faculty}
        year={isOwner ? offer.proposer.year : offer.post.seller.year}
      />

      {/* The bench, read-only. Sides are labelled from the viewer's
          perspective, so "You give" always means what leaves your hands. */}
      <TradeBench
        inventory={[]}
        offered={isOwner ? wanted : offered}
        onOfferedChange={() => {}}
        wanted={isOwner ? offered : wanted}
        additionalMoney={offer.additional_money}
        onAdditionalMoneyChange={() => {}}
        minSlots={0}
        isReadOnly
      />

      {pending ? (
        isOwner ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onPress={() => respond("Offer declined")}
              isDisabled={busy}
            >
              <X className="size-4" />
              Decline
            </Button>

            <OverlayTrigger>
              <Button>
                <Check className="size-4" />
                Accept offer
              </Button>

              <Overlay
                title="Choose how you will hand over"
                description="Accepting automatically declines every other offer on this post and opens a chat room."
                footer={
                  <>
                    <Button variant="ghost" slot="close">
                      Not yet
                    </Button>
                    <Button
                      isLoading={busy}
                      onPress={() =>
                        respond("Offer accepted. A chat room has been opened for you.", "/deals/504")
                      }
                    >
                      Confirm acceptance
                    </Button>
                  </>
                }
              >
                <RadioGroupField
                  aria-label="Handover method"
                  value={method}
                  onChange={(v) => setMethod(v as DeliveryMethod)}
                  variant="card"
                >
                  <Radio
                    value="Meetup"
                    description={
                      offer.additional_money > 0
                        ? "Meet up, inspect the items, the proposer transfers the difference and uploads a slip, you check it and scan the QR to close"
                        : "Meet up, swap the items, scan the QR to close. No money involved."
                    }
                  >
                    <span className="flex items-center gap-2">
                      <MapPin aria-hidden className="size-4" />
                      Meetup
                    </span>
                  </Radio>
                  <Radio
                    value="Shipping"
                    description="Post the items to each other. Both sides enter a tracking number."
                  >
                    <span className="flex items-center gap-2">
                      <Truck aria-hidden className="size-4" />
                      Shipping
                    </span>
                  </Radio>
                </RadioGroupField>

                {offer.additional_money > 0 ? (
                  <p className="mt-4 rounded-control bg-tone-warning-bg p-3 text-[0.8125rem] leading-[1.6] text-tone-warning-fg">
                    This offer adds cash: ฿
                    {offer.additional_money.toLocaleString("en-GB")} —
                    a slip upload and slip check are added before the QR
                  </p>
                ) : (
                  <p className="mt-4 rounded-control bg-tone-trade-bg p-3 text-[0.8125rem] leading-[1.6] text-tone-trade-fg">
                    Pure trade with no money. No slip needed. It ends with a
                    QR scan.
                  </p>
                )}
              </Overlay>
            </OverlayTrigger>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              isLoading={busy}
              onPress={() => respond("Offer withdrawn")}
            >
              <Undo2 className="size-4" />
              Withdraw offer
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
