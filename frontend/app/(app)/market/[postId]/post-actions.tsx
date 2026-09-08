"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Flag, Handshake, MapPin, ShoppingBag, Truck } from "lucide-react";

import { ActionBar } from "@/components/kit/action-bar";
import { Button, LinkButton } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { ReportDialog } from "@/components/kit/report-dialog";
import { useToast } from "@/components/kit/toast";
import type { DeliveryMethod } from "@/lib/status";
import type { Post } from "@/lib/api/types";

/** §7.5.1 — the system-provided reasons for a post report. */
const POST_REPORT_REASONS = [
  {
    id: "illegal-item",
    label: "Illegal or prohibited item",
    description: "The item itself is not allowed on the platform",
  },
  {
    id: "inappropriate-content",
    label: "Inappropriate content (scam or spam)",
    description: "The listing looks like a scam, or is spam",
  },
  {
    id: "false-info",
    label: "False information in the listing",
    description: "Photos, price, or details do not match reality",
  },
];

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
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = useState<DeliveryMethod>("Meetup");
  const [busy, setBusy] = useState(false);

  const canBuy = post.post_type !== "TradeOnly";
  const canTrade = post.post_type !== "SellOnly";

  if (isMine) {
    return (
      <div className="sticky action-bar-bottom z-[20] flex gap-2 lg:static">
        <LinkButton
          variant="secondary"
          block
          className="lg:w-auto"
          href={`/inventory/${post.item_id}/list`}
        >{t("inventory.editListing")}</LinkButton>
      </div>
    );
  }

  async function buy() {
    setBusy(true);
    // POST /posts/{id}/buy → { delivery_method, quantity }
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.success("Deal created. A chat room has been opened for you.");
    // UI mock: the real call returns the new transaction id. Transaction 6 is
    // the fixture where the viewer is the buyer, so the redirect through
    // /history/[txId] lands in a room instead of a 404. Delete with the fixtures.
    router.push("/history/6");
  }

  return (
    <ActionBar className="-mx-1">
      {canBuy ? (
        <OverlayTrigger>
          <Button block size="lg" className="lg:w-auto">
            <ShoppingBag className="size-5" />{t("market.buyNow")}</Button>

          <Overlay
            isBusy={busy}
            title={t("market.chooseDelivery")}
            description={t("market.chooseDeliveryBody")}
            footer={
              <>
                <Button variant="ghost" slot="close">{t("inventory.cancel")}</Button>
                <Button onPress={buy} isLoading={busy}>
                  <Handshake className="size-4" />{t("market.confirmPurchase")}</Button>
              </>
            }
          >
            <RadioGroupField
              aria-label={t("market.deliveryMethod")}
              value={method}
              onChange={(v) => setMethod(v as DeliveryMethod)}
              variant="card"
            >
              <Radio
                value="Meetup"
                description={t("market.meetupBody")}
              >
                <span className="flex items-center gap-2">
                  <MapPin aria-hidden className="size-4" />{t("market.meetup")}</span>
              </Radio>
              <Radio
                value="Shipping"
                description={t("market.shippingBody")}
              >
                <span className="flex items-center gap-2">
                  <Truck aria-hidden className="size-4" />{t("market.shipping")}</span>
              </Radio>
            </RadioGroupField>

            <p className="mt-4 rounded-control bg-tone-warning-bg p-3 text-caption leading-[1.6] text-tone-warning-fg">
              Money moves directly between you, outside the platform. The app keeps the slip and the timestamps as evidence for both sides. Do not transfer before confirming here.
            </p>
          </Overlay>
        </OverlayTrigger>
      ) : null}

      {canTrade ? (
        <LinkButton
          variant={canBuy ? "secondary" : "trade"}
          size="lg"
          block
          className={canBuy ? "text-tone-trade-fg lg:w-auto" : "lg:w-auto"}
          href={`/offers/new?post=${post.post_id}`}
        >
          <ArrowLeftRight className="size-5" />{t("market.offerTrade")}</LinkButton>
      ) : null}

      <ReportDialog
        reportType="Post"
        targetId={post.post_id}
        reasons={POST_REPORT_REASONS}
        trigger={
          <Button
            variant="ghost"
            size="lg"
            aria-label={t("market.reportPost")}
            className="self-end lg:self-auto"
          >
            <Flag className="size-5" />
          </Button>
        }
      />
    </ActionBar>
  );
}
