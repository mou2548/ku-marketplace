"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeftRight, ChevronRight, Inbox } from "lucide-react";

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
import { offerSides } from "@/lib/offers";
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
  const t = useTranslations();
  const sent = offers.filter((o) => o.proposer_id === viewerId);
  const received = offers.filter((o) => o.post.seller.user_id === viewerId);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-overline font-semibold text-tone-trade-fg uppercase">
          {t("offer.tradeDesk")}
        </p>
        <h1 className="mt-1 text-h1">{t("offer.title")}</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-ink-muted">
          {t("offer.inboxHint")}
        </p>
      </header>

      <Tabs defaultSelectedKey="received">
        <TabList aria-label={t("offer.title")} variant="underline">
          <UnderlineTab id="received" className="group">
            {t("offer.offersToMe")}
            {received.length > 0 ? <TabCount>{received.length}</TabCount> : null}
          </UnderlineTab>
          <UnderlineTab id="sent" className="group">
            {t("offer.myOffers")}
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
    </div>
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
  const t = useTranslations();
  if (offers.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-6" />}
        title={emptyTitle}
        description={emptyDescription}
        action={
          direction === "sent" ? (
            <LinkButton href="/market">
              <ArrowLeftRight className="size-4" />{t("offer.findTradeable")}</LinkButton>
          ) : undefined
        }
      />
    );
  }

  return (
    <ul className="grid gap-3 pt-4 xl:grid-cols-2">
      {offers.map((offer) => {
        const sides = offerSides(offer, viewerId);

        return (
          <li key={offer.offer_id}>
            <Link href={`/offers/${offer.offer_id}`}>
              <Surface as="div" shape="card" interactive className="flex h-full flex-col gap-4 p-4 sm:p-5">
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
                    <p className="truncate text-caption text-ink-muted">
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

                {/* The prose restated exactly what the two stacks above had
                    just shown, which is a third block of the same information
                    on a card the owner called too dense. It stays on the
                    detail screen, where nothing else competes with it. */}

                {direction === "received" ? (
                  <TrustBadge
                    name={sides.counterparty.name}
                    isVerified={sides.counterparty.isVerified}
                    faculty={sides.counterparty.faculty}
                    size="sm"
                  />
                ) : null}

                {/* The card had no action row at all. On a received offer the
                    decision is the entire point of the row and it was
                    invisible until the card was opened; register.md §5 wants a
                    full-width 44px action. The whole card stays a link, so
                    this reads as the affordance rather than a second target. */}
                <span className="mt-auto flex min-h-11 items-center justify-between gap-2 rounded-control bg-brand-subtle px-3 text-body-sm font-medium text-ink-brand">
                  {direction === "received"
                    ? offer.status === "Pending"
                      ? "Accept or decline"
                      : "See this offer"
                    : "See your offer"}
                  <ChevronRight aria-hidden className="size-4 shrink-0" />
                </span>
              </Surface>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
