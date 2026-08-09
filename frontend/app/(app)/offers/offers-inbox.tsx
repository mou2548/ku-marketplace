"use client";

import Link from "next/link";
import { ArrowLeftRight, Inbox } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import {
  TabCount,
  TabList,
  TabPanel,
  Tabs,
  UnderlineTab,
} from "@/components/kit/tabs";
import { TrustBadge } from "@/components/kit/trust-badge";
import { OfferSummary } from "@/components/kit/offer-summary";
import type { Offer } from "@/lib/api/types";
import { describeOffer, offerSides } from "@/lib/offers";
import { OFFER_STATUS } from "@/lib/status";

/**
 * Underline tabs rather than segments because each side carries a count, and a
 * pill with a badge crammed inside gets cramped at 360px (components.md §5).
 */
export function OffersInbox({
  offers,
  viewerId,
}: {
  offers: Offer[];
  viewerId: number;
}) {
  const sent = offers.filter((o) => o.proposer_id === viewerId);
  const received = offers.filter((o) => o.post.seller.user_id === viewerId);

  return (
    <Tabs defaultSelectedKey="received">
      <TabList aria-label="Offers" variant="underline">
        <UnderlineTab id="received" className="group">
          Offers to me
          {received.length > 0 ? <TabCount>{received.length}</TabCount> : null}
        </UnderlineTab>
        <UnderlineTab id="sent" className="group">
          My offers
          {sent.length > 0 ? <TabCount>{sent.length}</TabCount> : null}
        </UnderlineTab>
      </TabList>

      <TabPanel id="received">
        <OfferList
          offers={received}
          viewerId={viewerId}
          direction="received"
          emptyTitle="No one has offered you a trade yet"
          emptyDescription="When someone offers a trade on one of your posts, it lands here with their whole stack visible"
        />
      </TabPanel>

      <TabPanel id="sent">
        <OfferList
          offers={sent}
          viewerId={viewerId}
          direction="sent"
          emptyTitle="You have not made any offers yet"
          emptyDescription="Find a post that accepts trades, then put items from your inventory on the table"
        />
      </TabPanel>
    </Tabs>
  );
}

function OfferList({
  offers,
  viewerId,
  direction,
  emptyTitle,
  emptyDescription,
}: {
  offers: Offer[];
  viewerId: number;
  direction: "sent" | "received";
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (offers.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-6" />}
        title={emptyTitle}
        description={emptyDescription}
        action={
          direction === "sent" ? (
            <LinkButton href="/market">
              <ArrowLeftRight className="size-4" />
              Find items open to trade
            </LinkButton>
          ) : undefined
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2 pt-4">
      {offers.map((offer) => {
        const sides = offerSides(offer, viewerId);

        return (
          <li key={offer.offer_id}>
            <Link href={`/offers/${offer.offer_id}`}>
              <Surface as="div" shape="card" interactive className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  {/* Who and about what. The old version led with the post's
                      item name, which on a received offer is your own thing —
                      so the row opened by telling you something you know. */}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {direction === "sent"
                        ? `Your offer to ${sides.counterparty.name}`
                        : `${sides.counterparty.name} wants to trade`}
                    </p>
                    <p className="truncate text-[0.8125rem] text-ink-muted">
                      {direction === "sent" ? "for their " : "for your "}
                      {offer.post.item.name}
                    </p>
                  </div>
                  <StatusBadge status={OFFER_STATUS[offer.status]} size="sm" />
                </div>

                {/* The piles themselves, with photos — fairness is judged by
                    looking, not by reading a count (research P3, principle 6). */}
                <OfferSummary
                  youGet={sides.youGet}
                  youGive={sides.youGive}
                  money={sides.money}
                  moneyDirection={sides.moneyDirection}
                  size="sm"
                />

                {/* And the same thing in words, for anyone who would rather
                    read it than decode two rows of thumbnails. */}
                <p className="text-[0.8125rem] leading-[1.6] text-ink-secondary">
                  {describeOffer(sides)}
                </p>

                {direction === "received" ? (
                  <TrustBadge
                    name={sides.counterparty.name}
                    isVerified={sides.counterparty.isVerified}
                    faculty={sides.counterparty.faculty}
                    size="sm"
                  />
                ) : null}
              </Surface>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
