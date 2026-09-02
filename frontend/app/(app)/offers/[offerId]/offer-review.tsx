"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  MessageCircle,
  Undo2,
  X,
} from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TradeBench } from "@/components/kit/trade-bench";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import type { Item, Offer } from "@/lib/api/types";
import { describeOffer, offerSides } from "@/lib/offers";
import { OFFER_STATUS } from "@/lib/status";

/** The bench takes inventory slots; an offer carries full items. */
const toSlot = (item: Item) => ({
  item_id: item.item_id,
  name: item.name,
  quantity: item.quantity,
  condition: item.condition,
  category: item.category,
  image_url: item.images.find((i) => i.is_primary)?.image_url ?? null,
});

export function OfferReview({
  offer,
  viewerId,
}: {
  offer: Offer;
  viewerId: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // A trade is always handed over in person — there is no shipping branch for a
  // swap (activity diagram: trade flow). Acceptance resolves in place; the
  // panel names this counterparty and item so the right deal is seen closing.
  const [accepted, setAccepted] = useState(false);

  // Both sides come from one derivation, shared with the inbox, so the piles
  // cannot land in one arrangement on the list and the opposite one here.
  const sides = offerSides(offer, viewerId);
  const isOwner = !sides.viewerIsProposer;
  const pending = offer.status === "Pending";

  // Decline and withdraw send the viewer back to the inbox; only acceptance
  // opens a room, so only it needs an in-place confirmation.
  async function respond(message: string) {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(message);
    router.push("/offers");
  }

  async function accept() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    setAccepted(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/offers"
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to offers
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* Same two lines as the card the viewer tapped to get here. */}
          <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
            {isOwner
              ? `${sides.counterparty.name} wants to trade`
              : `Your offer to ${sides.counterparty.name}`}
          </h1>
          {/* The post is the thing being argued over and had no route out of
              this screen. The inbox card is one big link, so the second
              destination belongs here. */}
          <p className="text-[0.875rem] text-ink-muted">
            {isOwner ? "for your " : "for their "}
            <Link
              href={`/market/${offer.post_id}`}
              className="font-medium text-ink-brand hover:underline"
            >
              {offer.post.item.name}
            </Link>
          </p>
        </div>
        <StatusBadge status={OFFER_STATUS[offer.status]} />
      </header>

      <TrustBadge
        name={sides.counterparty.name}
        isVerified={sides.counterparty.isVerified}
        faculty={sides.counterparty.faculty}
        year={sides.counterparty.year}
      />

      {/* The deal in one sentence, above the bench rather than below it. This
          is the plain-language answer to "who gives what"; it has no business
          sitting under two item grids where it needs scrolling to reach. */}
      <p className="text-[0.9375rem] leading-[1.7] text-ink-secondary">
        {describeOffer(sides)}
      </p>

      {/* The bench, read-only. Sides are labelled from the viewer's
          perspective, so "You give" always means what leaves your hands. */}
      <TradeBench
        youGet={sides.youGet.map(toSlot)}
        youGive={sides.youGive.map(toSlot)}
        onYouGiveChange={() => {}}
        additionalMoney={sides.money}
        onAdditionalMoneyChange={() => {}}
        moneyDirection={sides.moneyDirection}
        counterpartyName={sides.counterparty.name}
        minSlots={0}
        isReadOnly
      />

      {accepted || offer.status === "Accepted" ? (
        <Surface
          shape="card"
          className="flex flex-col gap-3 border-l-4 border-l-tone-success-solid bg-tone-success-bg p-4"
        >
          <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-tone-success-fg">
            <CheckCircle2 aria-hidden className="size-5 shrink-0" />
            Offer accepted
          </p>
          <p className="text-[0.875rem] leading-[1.7] text-ink-secondary">
            You are trading with {sides.counterparty.name} for{" "}
            {offer.post.item.name}, handed over in person. Every other offer on
            this post is declined and a chat room is open.
          </p>
          {offer.transaction_id ? (
            // The accepted offer's transaction; /history/:id redirects to its
            // chat room.
            <LinkButton
              variant="secondary"
              href={`/history/${offer.transaction_id}`}
              className="w-fit"
            >
              <MessageCircle className="size-4" />
              Open chat
            </LinkButton>
          ) : null}
        </Surface>
      ) : pending ? (
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
                title="Confirm the trade"
                description="A trade is always handed over in person. Accepting declines every other offer on this post and opens a chat room."
                footer={
                  <>
                    <Button variant="ghost" slot="close">
                      Not yet
                    </Button>
                    <Button isLoading={busy} slot="close" onPress={accept}>
                      Confirm acceptance
                    </Button>
                  </>
                }
              >
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
