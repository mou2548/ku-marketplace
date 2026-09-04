"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Package,
  Sparkles,
} from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { TextInput } from "@/components/kit/field";
import { Overlay } from "@/components/kit/overlay";
import { Surface } from "@/components/kit/surface";
import { PostImage } from "@/components/kit/post-image";
import { TrustBadge } from "@/components/kit/trust-badge";
import { Notice } from "@/components/patterns/notice";
import { TradeBench, TradeSourcePanel } from "@/components/kit/trade-bench";
import { useToast } from "@/components/kit/toast";
import type { InventoryItem } from "@/components/kit/inventory-slot";
import { saveItemEdits, saveNewItem } from "@/lib/actions/items";
import { sendOffer } from "@/lib/actions/posts";
import type { Item, Post } from "@/lib/api/types";

/**
 * Persona P3, design principle 6.
 *
 * The old flow was a checkbox list plus a number field, which makes fairness
 * impossible to judge — you cannot compare two piles you can only read. Here
 * the piles are the interface: tap from your stash onto the table, watch the
 * cash gap in the middle, and the answer to "is this fair?" is visible without
 * reading a label.
 *
 * On mobile the stash sits below the bench rather than beside it; tapping to
 * place works the same, and every slot stays keyboard-operable.
 */
export function OfferComposer({
  post,
  inventory,
}: {
  post: Post;
  inventory: Item[];
}) {
  const t = useTranslations();
  const toast = useToast();
  const [offered, setOffered] = useState<InventoryItem[]>([]);
  const [money, setMoney] = useState(0);
  const [busy, setBusy] = useState(false);
  // Confirming in place rather than navigating: the offer now really is in
  // the inbox, but the sender's next question is "what did I just send?", and
  // /offers answers a different one.
  const [sent, setSent] = useState(false);

  // Local, editable copy of the stash. An offer can only carry a whole item
  // (`Offer.items` has no per-item quantity — lib/api/types.ts, confirmed
  // against the real `POST /posts/{id}/offers` body, which takes `item_ids`
  // and nothing else), so offering fewer than a full stack means carving that
  // amount out into its own item row first. That split has to live somewhere
  // the rest of the screen can see it, hence local state rather than a memo
  // over the `inventory` prop.
  const [items, setItems] = useState<Item[]>(inventory);
  const [splitTarget, setSplitTarget] = useState<InventoryItem | null>(null);
  const [splitQty, setSplitQty] = useState("1");
  const [splitBusy, setSplitBusy] = useState(false);

  const stash: InventoryItem[] = useMemo(
    () =>
      items
        .filter((i) => i.quantity > 0)
        .map((i) => ({
          item_id: i.item_id,
          name: i.name,
          quantity: i.quantity,
          condition: i.condition,
          category: i.category,
          image_url: i.images[0]?.image_url ?? null,
        })),
    [items],
  );

  const wanted: InventoryItem[] = [
    {
      item_id: post.item.item_id,
      name: post.item.name,
      quantity: 1,
      condition: post.item.condition,
      category: post.item.category,
      image_url: post.item.images[0]?.image_url ?? null,
    },
  ];

  const offeredIds = useMemo(
    () => new Set(offered.map((i) => i.item_id)),
    [offered],
  );

  const canSubmit = offered.length > 0 || money > 0;

  function addToOffer(item: InventoryItem) {
    setOffered((list) =>
      list.some((i) => i.item_id === item.item_id) ? list : [...list, item],
    );
  }

  // A single-unit stack goes straight to the bench, same as before. A
  // multi-unit stack opens the split dialog so "how many" is a question the
  // screen actually asks rather than assuming "all of them."
  function tapStash(item: InventoryItem) {
    if (item.quantity > 1) {
      setSplitTarget(item);
      setSplitQty(String(item.quantity));
    } else {
      addToOffer(item);
    }
  }

  async function confirmSplit() {
    if (!splitTarget) return;
    const n = Math.min(Math.max(Number(splitQty) || 0, 1), splitTarget.quantity);
    setSplitBusy(true);

    if (n === splitTarget.quantity) {
      // The whole stack — nothing to split, offer the item as-is.
      addToOffer(splitTarget);
      setSplitBusy(false);
      setSplitTarget(null);
      return;
    }

    const original = items.find((i) => i.item_id === splitTarget.item_id);
    if (!original) {
      setSplitBusy(false);
      setSplitTarget(null);
      return;
    }

    // The split is two real writes, and the order matters: shrink the original
    // first, so a failure on the second call leaves the stash short rather
    // than double-counted. An offer carries whole items only (`item_ids` and
    // nothing else), so the carved-out row has to exist server-side before it
    // can be offered — a locally invented id would be rejected.
    try {
      await saveItemEdits(original.item_id, { quantity: original.quantity - n });
    } catch (err) {
      setSplitBusy(false);
      toast.show(err instanceof Error ? err.message : "Could not split this item");
      return;
    }

    let splitItem: Item;
    try {
      splitItem = await saveNewItem({
        name: original.name,
        category: original.category,
        condition: original.condition,
        quantity: n,
        description: original.description ?? undefined,
        course_name: original.course_name ?? undefined,
        brand_model: original.brand_model ?? undefined,
        warranty_expiry: original.warranty_expiry ?? undefined,
        size: original.size ?? undefined,
        images: original.images.map((img, i) => ({
          image_url: img.image_url,
          is_primary: i === 0,
          display_order: i,
        })),
      });
    } catch (err) {
      // Put the units back rather than leaving them lost between two rows.
      await saveItemEdits(original.item_id, { quantity: original.quantity }).catch(
        () => undefined,
      );
      setSplitBusy(false);
      toast.show(err instanceof Error ? err.message : "Could not split this item");
      return;
    }

    setItems((list) => [
      ...list.map((i) =>
        i.item_id === original.item_id ? { ...i, quantity: i.quantity - n } : i,
      ),
      splitItem,
    ]);
    addToOffer({
      item_id: splitItem.item_id,
      name: splitItem.name,
      quantity: splitItem.quantity,
      condition: splitItem.condition,
      category: splitItem.category,
      image_url: splitItem.images[0]?.image_url ?? null,
    });

    setSplitBusy(false);
    setSplitTarget(null);
  }

  async function submit() {
    setBusy(true);
    try {
      await sendOffer(post.post_id, {
        item_ids: offered.map((i) => i.item_id),
        additional_money: money > 0 ? money : undefined,
      });
    } catch (err) {
      setBusy(false);
      toast.show(err instanceof Error ? err.message : "Could not send this offer");
      return;
    }
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <Notice tone="success" className="flex flex-col gap-3 p-5">
        <p className="flex items-center gap-2 text-body-lg font-semibold text-tone-success-fg">
          <CheckCircle2 aria-hidden className="size-5 shrink-0" />{t("offer.sent")}</p>
        <p className="text-body-sm text-ink-secondary">
          You offered {post.seller.name}{" "}
          {offered.length > 0
            ? `${offered.length} ${offered.length === 1 ? "item" : "items"}`
            : "no items"}
          {money > 0 ? ` plus ฿${money.toLocaleString("en-GB")}` : ""} for{" "}
          {post.item.name}. They will see it and can accept or decline.
        </p>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/market">{t("offer.keepBrowsing")}</LinkButton>
          <LinkButton variant="secondary" href="/offers">{t("offer.myOffers")}</LinkButton>
        </div>
      </Notice>
    );
  }

  if (stash.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-6" />}
        title={t("inventory.emptyTitle")}
        description={t("offer.emptyStashBody")}
        action={
          <LinkButton href="/inventory/new">{t("inventory.addItem")}</LinkButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/market/${post.post_id}`}
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />{t("offer.backToListing")}</Link>

      <header>
        <p className="text-overline font-semibold text-tone-trade-fg uppercase">
          {t("offer.buildOffer")}
        </p>
        <h1 className="mt-1 text-h1">{t("offer.composeTitle")}</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-ink-muted">
          {t("offer.composeHint")}
        </p>
      </header>

      <Surface as="section" shape="panel" className="overflow-hidden p-0">
        <div className="grid sm:grid-cols-[10rem_minmax(0,1fr)]">
          <PostImage
            src={
              post.item.images.find((image) => image.is_primary)?.image_url ??
              post.item.images[0]?.image_url
            }
            alt={post.item.name}
            aspectRatio={1}
            sizes="(max-width: 640px) 100vw, 160px"
            className="h-44 rounded-none sm:h-full"
          />
          <div className="flex min-w-0 flex-col justify-center gap-3 p-4 sm:p-5">
            <div>
              <p className="text-overline text-ink-muted uppercase">
                {t("offer.tradingFor")}
              </p>
              <h2 className="mt-1 text-[1.25rem] leading-[1.3] font-semibold">
                {post.item.name}
              </h2>
            </div>
            {post.wanted_item_offer ? (
              <div className="flex gap-2.5 rounded-control bg-tone-trade-bg p-3 text-tone-trade-fg">
                <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p className="text-caption leading-[1.55]">
                  <span className="font-semibold">{t("offer.ownerWants")}</span>{" "}
                  {post.wanted_item_offer}
                </p>
              </div>
            ) : null}
            <TrustBadge
              name={post.seller.name}
              isVerified={post.seller.isVerified}
              faculty={post.seller.faculty}
              year={post.seller.year}
              avatarUrl={post.seller.avatar_url}
              size="sm"
            />
          </div>
        </div>
      </Surface>

      {/* The stash comes first on a phone.
          The bench rendered above it, so at 360px the two plate panels plus
          the seam were comfortably 600px before the inventory appeared — and
          the instruction to tap an item pointed at something off-screen. The
          interaction starts in the stash, so on a narrow screen the stash
          starts the page. From `lg:` there is room for reading order to go
          back to bench-then-source. */}
      <div className="flex flex-col gap-5">
        <TradeSourcePanel
          className="order-1 lg:order-2"
          inventory={stash}
          offeredIds={offeredIds}
          onAdd={tapStash}
        />

        <TradeBench
          className="order-2 lg:order-1"
          youGet={wanted}
          youGive={offered}
          onYouGiveChange={setOffered}
          additionalMoney={money}
          onAdditionalMoneyChange={setMoney}
          // Composing an offer, you are always the one putting the cash up.
          moneyDirection="you-pay"
          counterpartyName={post.seller.name}
        />
      </div>

      <Overlay
        isOpen={!!splitTarget}
        onOpenChange={(open) => {
          if (!open) setSplitTarget(null);
        }}
        title={splitTarget ? `How many ${splitTarget.name} to offer?` : ""}
        description={
          splitTarget
            ? `You have ${splitTarget.quantity} of these. Offering fewer splits it into its own item, so the seller sees exactly what is on the table.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onPress={() => setSplitTarget(null)}
              isDisabled={splitBusy}
            >{t("inventory.cancel")}</Button>
            <Button isLoading={splitBusy} onPress={confirmSplit}>{t("offer.addToOffer")}</Button>
          </>
        }
      >
        <TextInput
          label={t("offer.quantityToOffer")}
          value={splitQty}
          onChange={(v) => setSplitQty(v.replace(/\D/g, ""))}
          inputMode="numeric"
          hint={splitTarget ? `Max ${splitTarget.quantity}` : undefined}
        />
      </Overlay>

      {/* Sticky on mobile: the submit must not be below a scrolling stash. */}
      <Surface
        shape="card"
        className="sticky action-bar-bottom z-[20] flex items-center gap-3 p-3 lg:static"
      >
        {/* Same phrasing as the review screen and the inbox card, so what you
            are about to send reads the way it will read once it is sent. */}
        <p className="min-w-0 flex-1 text-caption text-ink-muted">
          {offered.length > 0
            ? `You give ${offered.length} ${offered.length === 1 ? "item" : "items"}`
            : "Nothing on the table yet"}
          {money > 0 ? ` plus ฿${money.toLocaleString("en-GB")}` : ""}
        </p>
        <Button size="lg" isDisabled={!canSubmit} isLoading={busy} onPress={submit}>
          <ArrowLeftRight className="size-5" />{t("offer.send")}</Button>
      </Surface>
    </div>
  );
}
