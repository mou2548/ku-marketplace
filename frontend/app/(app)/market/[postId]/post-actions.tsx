"use client";

import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, Handshake, MapPin, MessageCircle, ShoppingBag, Truck } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { Surface } from "@/components/kit/surface";
import type { DeliveryMethod } from "@/lib/status";
import type { Post } from "@/lib/api/types";

/**
 * E3 entry point. Two decisions happen here and nowhere else:
 *
 *  1. **Buy or offer a trade.** On a `Both` post both are shown as peers.
 *  2. **Meetup or Shipping.** Research R3: the transaction commits to one path
 *     the moment this is chosen, and everything downstream shows only that
 *     path's steps. So it is a deliberate choice with both options explained,
 *     not a dropdown default nobody reads.
 *
 * The bar is sticky at the bottom on mobile — the action must not be below the
 * fold on a phone.
 */
export function PostActions({ post, isMine }: { post: Post; isMine: boolean }) {
  const [method, setMethod] = useState<DeliveryMethod>("Meetup");
  const [busy, setBusy] = useState(false);
  // The purchase is confirmed in place rather than by jumping to a fixture chat
  // room that belongs to a different item. The success panel names this item
  // and this seller, so the demo shows the right deal was made.
  const [boughtWith, setBoughtWith] = useState<DeliveryMethod | null>(null);

  const canBuy = post.post_type !== "TradeOnly";
  const canTrade = post.post_type !== "SellOnly";

  if (boughtWith) {
    return (
      <Surface
        shape="card"
        className="flex flex-col gap-3 border-l-4 border-l-tone-success-solid bg-tone-success-bg p-4"
      >
        <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-tone-success-fg">
          <CheckCircle2 aria-hidden className="size-5 shrink-0" />
          Deal created
        </p>
        <p className="text-[0.875rem] leading-[1.7] text-ink-secondary">
          You bought {post.item.name} from {post.seller.name} by{" "}
          {boughtWith === "Meetup" ? "meetup" : "shipping"}. A chat room is open
          so you can arrange the handover.
        </p>
        <LinkButton variant="secondary" href="/chat" className="w-fit">
          <MessageCircle className="size-4" />
          Open chat
        </LinkButton>
      </Surface>
    );
  }

  if (isMine) {
    return (
      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[20] flex gap-2 lg:static">
        <LinkButton
          variant="secondary"
          block
          className="lg:w-auto"
          href={`/inventory/${post.item_id}/list`}
        >
          Edit listing
        </LinkButton>
      </div>
    );
  }

  async function buy() {
    setBusy(true);
    // POST /posts/{id}/buy → { delivery_method, quantity }
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    setBoughtWith(method);
  }

  return (
    <div
      className={
        "sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[20] " +
        "-mx-4 flex gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur " +
        "lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
      }
    >
      {canBuy ? (
        <OverlayTrigger>
          <Button block size="lg" className="lg:w-auto">
            <ShoppingBag className="size-5" />
            Buy now
          </Button>

          <Overlay
            title="Choose how you will get it"
            description="This cannot be changed later. The steps after this differ depending on what you pick."
            footer={
              <>
                <Button variant="ghost" slot="close">
                  Cancel
                </Button>
                <Button onPress={buy} isLoading={busy}>
                  <Handshake className="size-4" />
                  Confirm purchase
                </Button>
              </>
            }
          >
            <RadioGroupField
              aria-label="Delivery method"
              value={method}
              onChange={(v) => setMethod(v as DeliveryMethod)}
              variant="card"
            >
              <Radio
                value="Meetup"
                description="Meet on campus, inspect before paying, finish by scanning the seller QR"
              >
                <span className="flex items-center gap-2">
                  <MapPin aria-hidden className="size-4" />
                  Meetup
                </span>
              </Radio>
              <Radio
                value="Shipping"
                description="Pay first, upload a slip, the seller confirms and posts it with a tracking number"
              >
                <span className="flex items-center gap-2">
                  <Truck aria-hidden className="size-4" />
                  Shipping
                </span>
              </Radio>
            </RadioGroupField>

            <p className="mt-4 rounded-control bg-tone-warning-bg p-3 text-[0.8125rem] leading-[1.6] text-tone-warning-fg">
              Money moves directly between you, outside the platform. The app keeps the slip and the timestamps as evidence for both sides. Do not transfer before confirming here.
            </p>
          </Overlay>
        </OverlayTrigger>
      ) : null}

      {canTrade ? (
        <LinkButton
          variant={canBuy ? "secondary" : "primary"}
          size="lg"
          block
          className="lg:w-auto"
          href={`/offers/new?post=${post.post_id}`}
        >
          <ArrowLeftRight className="size-5" />
          Offer a trade
        </LinkButton>
      ) : null}
    </div>
  );
}
