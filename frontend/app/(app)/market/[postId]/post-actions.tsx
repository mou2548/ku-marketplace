"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check, Flag, MapPin, ShoppingBag, Truck } from "lucide-react";

import { ActionBar } from "@/components/kit/action-bar";
import { Button, LinkButton } from "@/components/kit/button";
import { Radio, RadioGroup } from "react-aria-components";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { ReportDialog } from "@/components/kit/report-dialog";
import { useToast } from "@/components/kit/toast";
import type { DeliveryMethod } from "@/lib/status";
import { buyPostAction } from "@/lib/actions/posts";
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
  const deliveryId = useId();

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
    if (busy) return;
    setBusy(true);
    try {
      const deal = await buyPostAction(post.post_id, { delivery_method: method, quantity: 1 });
      const transactionId = Number(deal.transaction_id.replace(/^transaction_/, ""));
      if (!Number.isSafeInteger(transactionId) || transactionId < 1) throw new Error("The purchase returned an invalid transaction ID");
      toast.success("Deal created. A chat room has been opened for you.");
      router.push(`/history/${transactionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the purchase");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionBar className="-mx-1 lg:flex-col lg:items-stretch">
      {canBuy ? (
        <OverlayTrigger>
          <Button block size="lg" isDisabled={post.quantity_remaining < 1}>
            <ShoppingBag className="size-5" />
            {post.quantity_remaining < 1 ? t("market.soldOut") : t("market.buyNow")}
          </Button>

          <Overlay
            isBusy={busy}
            title={t("market.chooseDelivery")}
            description={t("market.chooseDeliveryBody")}
            footer={
              <>
                <Button variant="ghost" slot="close" isDisabled={busy}>{t("inventory.cancel")}</Button>
                <Button onPress={buy} isLoading={busy} className="sm:min-w-44">
                  {t("market.confirmPurchase")}</Button>
              </>
            }
          >
            <RadioGroup
              aria-label={t("market.deliveryMethod")}
              value={method}
              onChange={(value) => setMethod(value as DeliveryMethod)}
              isDisabled={busy}
              className="flex flex-col gap-2"
            >
              {([
                { value: "Meetup", icon: MapPin, title: "meetup", caption: "meetupCaption" },
                { value: "Shipping", icon: Truck, title: "shipping", caption: "shippingCaption" },
              ] as const).map(({ value, icon: Icon, title, caption }) => (
                <Radio
                  key={value}
                  value={value}
                  aria-labelledby={`${deliveryId}-${value}-label`}
                  aria-describedby={`${deliveryId}-${value}-description`}
                  className="group flex min-h-20 cursor-pointer items-center gap-3 rounded-control px-3.5 py-4 text-ink outline-none transition-colors hover:bg-surface-sunken data-[selected]:bg-surface-sunken data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand data-[disabled]:cursor-wait"
                >
                  {({ isSelected }) => (
                    <>
                      <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span id={`${deliveryId}-${value}-label`} className="text-body font-medium">{t(`market.${title}`)}</span>
                        <span id={`${deliveryId}-${value}-description`} className="text-body-sm font-normal leading-relaxed text-ink-muted">{t(`market.${caption}`)}</span>
                      </span>
                      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center self-center rounded-pill border border-ink-muted group-data-[selected]:border-brand group-data-[selected]:bg-brand group-data-[selected]:text-on-brand">
                        {isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                      </span>
                    </>
                  )}
                </Radio>
              ))}
            </RadioGroup>

            <p className="mt-4 mb-4 text-caption font-normal leading-relaxed text-ink-muted">
              {t("market.directPaymentNotice")}
            </p>
          </Overlay>
        </OverlayTrigger>
      ) : null}

      {canTrade ? (
        <LinkButton
          variant={canBuy ? "secondary" : "trade"}
          size="lg"
          block
          className={canBuy ? "text-tone-trade-fg" : undefined}
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
            className="self-end"
          >
            <Flag className="size-5" />
          </Button>
        }
      />
    </ActionBar>
  );
}
