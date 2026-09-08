"use client";

import { useTranslations } from "next-intl";
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
import { Overlay } from "@/components/kit/overlay";
import { StatusBadge } from "@/components/kit/status-badge";
import { Notice } from "@/components/patterns/notice";
import { TradeBench } from "@/components/kit/trade-bench";
import { TrustBadge } from "@/components/kit/trust-badge";
import { PostImage } from "@/components/kit/post-image";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import {
  acceptOfferAction,
  rejectOfferAction,
  withdrawOfferAction,
} from "@/lib/actions/posts";
import { wireIdToNumber } from "@/lib/api/posts";
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
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<"accept" | "reject" | "withdraw" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // A trade is always handed over in person — there is no shipping branch for a
  // swap (activity diagram: trade flow). Acceptance resolves in place; the
  // panel names this counterparty and item so the right deal is seen closing.
  const [accepted, setAccepted] = useState(false);
  const [transactionId, setTransactionId] = useState<number | null>(
    offer.transaction_id ?? null,
  );

  // Both sides come from one derivation, shared with the inbox, so the piles
  // cannot land in one arrangement on the list and the opposite one here.
  const sides = offerSides(offer, viewerId);
  const isOwner = !sides.viewerIsProposer;
  const pending = offer.status === "Pending";

  // Decline and withdraw send the viewer back to the inbox; only acceptance
  // opens a room, so only it needs an in-place confirmation.
  async function respond(
    call: () => Promise<unknown>,
    message: string,
    failure: string,
  ) {
    setBusy(true);
    setActionError(null);
    try {
      await call();
    } catch (err) {
      setBusy(false);
      setActionError(err instanceof Error ? err.message : failure);
      return;
    }
    setBusy(false);
    toast.success(message);
    setDecision(null);
    router.push("/offers");
  }

  async function accept() {
    setBusy(true);
    setActionError(null);
    let result;
    try {
      result = await acceptOfferAction(offer.post_id, offer.offer_id);
    } catch (err) {
      setBusy(false);
      setActionError(err instanceof Error ? err.message : "Could not accept this offer");
      return;
    }
    setBusy(false);
    // The offer this screen was rendered with predates the acceptance, so its
    // `transaction_id` is still null — without this the panel below has no
    // room to link to, which is the only thing left to do here.
    setTransactionId(wireIdToNumber(result.transaction_id));
    setAccepted(true);
    setDecision(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/offers"
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />{t("offer.backToOffers")}</Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-overline font-semibold text-tone-trade-fg uppercase">
            {t("offer.reviewOffer")}
          </p>
          {/* The item stays the identity from inbox to detail. */}
          <h1 className="mt-1 text-h1">{offer.post.item.name}</h1>
          <p className="text-body-sm text-ink-muted">
            {isOwner
              ? t("offer.receivedFromPerson", { name: sides.counterparty.name })
              : t("offer.sentToPerson", { name: sides.counterparty.name })}{" "}
            <span aria-hidden>·</span>{" "}
            <Link
              href={`/market/${offer.post_id}`}
              className="font-medium text-ink-brand hover:underline"
            >
              {t("offer.openListing")}
            </Link>
          </p>
        </div>
        <StatusBadge status={OFFER_STATUS[offer.status]} />
      </header>

      <Surface as="section" shape="card" className="overflow-hidden p-0">
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)]">
          <PostImage
            src={
              offer.post.item.images.find((image) => image.is_primary)
                ?.image_url ?? offer.post.item.images[0]?.image_url
            }
            alt={offer.post.item.name}
            aspectRatio={1}
            sizes="112px"
            className="h-full min-h-24 rounded-none"
          />
          <div className="flex min-w-0 flex-col justify-center gap-2 p-3.5 sm:p-4">
            <TrustBadge
              name={sides.counterparty.name}
              isVerified={sides.counterparty.isVerified}
              faculty={sides.counterparty.faculty}
              year={sides.counterparty.year}
              avatarUrl={sides.counterparty.avatar_url}
            />
            <p className="text-body-sm text-ink-secondary">
              {describeOffer(sides)}
            </p>
          </div>
        </div>
      </Surface>

      {/* The deal in one sentence, above the bench rather than below it. This
          is the plain-language answer to "who gives what"; it has no business
          sitting under two item grids where it needs scrolling to reach. */}
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
        <Notice tone="success" className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-body font-semibold text-tone-success-fg">
            <CheckCircle2 aria-hidden className="size-5 shrink-0" />{t("offer.accepted")}</p>
          <p className="text-body-sm text-ink-secondary">
            {t("offer.acceptedBody", {
              name: sides.counterparty.name,
              item: offer.post.item.name,
            })}
          </p>
          {transactionId ? (
            // The accepted offer's transaction; /history/:id redirects to its
            // chat room.
            <LinkButton
              variant="secondary"
              href={`/history/${transactionId}`}
              className="w-fit"
            >
              <MessageCircle className="size-4" />{t("offer.openChat")}</LinkButton>
          ) : null}
        </Notice>
      ) : pending ? (
        isOwner ? (
          /* The composer got a sticky action bar and the screen where the
             decision is actually made did not, so accept and decline sat below
             a full-height read-only bench — two plate panels and a seam. This
             is the highest-stakes control in the group; it does not scroll
             away. */
          <div className="sticky action-bar-bottom z-[20] flex flex-col-reverse gap-2 rounded-card bg-surface p-3 shadow-floating sm:static sm:flex-row sm:justify-end sm:bg-transparent sm:p-0 sm:shadow-none">
            <Button
              variant="secondary"
              onPress={() => setDecision("reject")}
              isDisabled={busy}
            >
              <X className="size-4" />{t("offer.decline")}</Button>

            <Button variant="trade" onPress={() => setDecision("accept")}>
              <Check className="size-4" />{t("offer.acceptOffer")}</Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              isLoading={busy}
              onPress={() => setDecision("withdraw")}
            >
              <Undo2 className="size-4" />{t("offer.withdraw")}</Button>
          </div>
        )
      ) : null}

      <Overlay
        isOpen={decision !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDecision(null);
            setActionError(null);
          }
        }}
        isBusy={busy}
        size="sm"
        title={
          decision === "accept"
            ? t("offer.confirmTrade")
            : decision === "reject"
              ? t("offer.declineTitle")
              : t("offer.withdrawTitle")
        }
        description={
          decision === "accept"
            ? t("offer.confirmTradeBody")
            : decision === "reject"
              ? t("offer.declineBody")
              : t("offer.withdrawBody")
        }
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={busy}
              onPress={() => setDecision(null)}
            >
              {t("offer.notYet")}
            </Button>
            <Button
              variant={decision === "accept" ? "trade" : decision === "reject" ? "danger" : "primary"}
              isLoading={busy}
              onPress={() => {
                if (decision === "accept") void accept();
                if (decision === "reject") {
                  void respond(
                    () => rejectOfferAction(offer.post_id, offer.offer_id),
                    "Offer declined",
                    "Could not decline this offer",
                  );
                }
                if (decision === "withdraw") {
                  void respond(
                    () => withdrawOfferAction(offer.post_id, offer.offer_id),
                    "Offer withdrawn",
                    "Could not withdraw this offer",
                  );
                }
              }}
            >
              {decision === "accept"
                ? t("offer.confirmAcceptance")
                : decision === "reject"
                  ? t("offer.confirmDecline")
                  : t("offer.confirmWithdraw")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="rounded-control bg-surface-sunken p-3 text-body-sm text-ink-secondary shadow-sunken">
            {offer.post.item.name} <span aria-hidden>·</span> {sides.counterparty.name}
          </p>
          {decision === "accept" ? (
            offer.additional_money > 0 ? (
              <p className="rounded-control bg-tone-warning-bg p-3 text-caption leading-[1.6] text-tone-warning-fg">
                This offer adds cash: ฿
                {offer.additional_money.toLocaleString("en-GB")} — a slip
                upload and slip check are added before the QR.
              </p>
            ) : (
              <p className="rounded-control bg-tone-trade-bg p-3 text-caption leading-[1.6] text-tone-trade-fg">
                Pure trade with no money. No slip needed. It ends with a QR scan.
              </p>
            )
          ) : null}
          {actionError ? (
            <p role="alert" className="text-body-sm font-medium text-tone-danger-fg">
              {actionError}
            </p>
          ) : null}
        </div>
      </Overlay>
    </div>
  );
}
