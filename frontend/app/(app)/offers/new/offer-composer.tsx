"use client";

import { getCopy } from "@/lib/copy";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Package,
  Sparkles,
} from "lucide-react";

import { ActionBar } from "@/components/kit/action-bar";
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
import { unwrapAction } from "@/lib/action-result";
import { removeItem, saveItemEdits, saveNewItem } from "@/lib/actions/items";
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
  const t = getCopy();
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
  // amount out into its own item row. That carve-out used to happen the
  // moment the quantity dialog was confirmed, which meant an abandoned offer
  // (closed tab, "Back to listing", removed from the bench) left the stash
  // permanently fragmented with no way to undo it. So a partial pick is now
  // staged purely as local state — a negative, client-only `item_id` — and
  // `pendingSplits` remembers which real item and quantity it stands for.
  // The real `PATCH`/`POST /items` writes that do the actual carving only
  // run inside `submit()`, once "Send offer" is pressed for real, and are
  // rolled back if the offer itself then fails to send.
  const [items, setItems] = useState<Item[]>(inventory);
  const [pendingSplits, setPendingSplits] = useState<
    Record<number, { sourceItemId: number; quantity: number }>
  >({});
  const nextVirtualId = useRef(-1);
  const [splitTarget, setSplitTarget] = useState<InventoryItem | null>(null);
  const [splitQty, setSplitQty] = useState("1");

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

  function confirmSplit() {
    if (!splitTarget) return;
    const n = Math.min(Math.max(Number(splitQty) || 0, 1), splitTarget.quantity);

    if (n === splitTarget.quantity) {
      // The whole stack — nothing to split, offer the item as-is.
      addToOffer(splitTarget);
      setSplitTarget(null);
      return;
    }

    const original = items.find((i) => i.item_id === splitTarget.item_id);
    if (!original) {
      setSplitTarget(null);
      return;
    }

    // Purely local bookkeeping — no request goes out here. The virtual id
    // just needs to be unique for this session; `submit()` is what turns it
    // into a real item, and only for the entries still in `offered` then.
    const virtualId = nextVirtualId.current--;
    setPendingSplits((map) => ({
      ...map,
      [virtualId]: { sourceItemId: original.item_id, quantity: n },
    }));
    setItems((list) =>
      list.map((i) =>
        i.item_id === original.item_id ? { ...i, quantity: i.quantity - n } : i,
      ),
    );
    addToOffer({
      item_id: virtualId,
      name: original.name,
      quantity: n,
      condition: original.condition,
      category: original.category,
      image_url: original.images[0]?.image_url ?? null,
    });

    setSplitTarget(null);
  }

  // Taking a staged (not-yet-real) entry off the bench must hand its units
  // back to the stash locally, since nothing was ever written to the server
  // for it.
  function handleOfferedChange(next: InventoryItem[]) {
    const nextIds = new Set(next.map((i) => i.item_id));
    const removed = offered.filter((i) => !nextIds.has(i.item_id));
    const restored = removed
      .map((i) => pendingSplits[i.item_id])
      .filter((p): p is { sourceItemId: number; quantity: number } => !!p);

    if (restored.length > 0) {
      setItems((list) =>
        list.map((i) => {
          const amount = restored
            .filter((p) => p.sourceItemId === i.item_id)
            .reduce((sum, p) => sum + p.quantity, 0);
          return amount > 0 ? { ...i, quantity: i.quantity + amount } : i;
        }),
      );
      setPendingSplits((map) => {
        const copy = { ...map };
        for (const i of removed) delete copy[i.item_id];
        return copy;
      });
    }
    setOffered(next);
  }

  async function submit() {
    setBusy(true);

    // This is the one place a split becomes real. Every staged entry gets
    // turned into an actual Item row here, in order, tracking what changed so
    // a failure anywhere in the sequence — including the final offer create —
    // can put every carved unit back rather than leaving the stash short.
    const remaining = new Map(inventory.map((i) => [i.item_id, i.quantity]));
    const createdItemIds: number[] = [];
    const shrunkSourceIds = new Set<number>();
    const finalItemIds: number[] = [];

    try {
      for (const entry of offered) {
        const pending = pendingSplits[entry.item_id];
        if (!pending) {
          finalItemIds.push(entry.item_id);
          continue;
        }
        const source = inventory.find((i) => i.item_id === pending.sourceItemId);
        const left = remaining.get(pending.sourceItemId);
        if (!source || left === undefined) {
          throw new Error("Could not find the item to split");
        }

        await unwrapAction(saveItemEdits(pending.sourceItemId, {
          quantity: left - pending.quantity,
        }));
        shrunkSourceIds.add(pending.sourceItemId);
        remaining.set(pending.sourceItemId, left - pending.quantity);

        const splitItem = await unwrapAction(saveNewItem({
          name: source.name,
          category: source.category,
          condition: source.condition,
          quantity: pending.quantity,
          description: source.description ?? undefined,
          course_name: source.course_name ?? undefined,
          brand_model: source.brand_model ?? undefined,
          warranty_expiry: source.warranty_expiry ?? undefined,
          size: source.size ?? undefined,
          images: source.images.map((img, i) => ({
            image_url: img.image_url,
            is_primary: i === 0,
            display_order: i,
          })),
        }));
        createdItemIds.push(splitItem.item_id);
        finalItemIds.push(splitItem.item_id);
      }

      await unwrapAction(sendOffer(post.post_id, {
        item_ids: finalItemIds,
        additional_money: money > 0 ? money : undefined,
      }));
    } catch (err) {
      // Undo every write this attempt made — delete rows it created, and put
      // shrunk originals back to their pre-submit quantity — so a failed
      // send never leaves the stash fragmented.
      for (const itemId of createdItemIds) {
        await unwrapAction(removeItem(itemId)).catch(() => undefined);
      }
      for (const sourceId of shrunkSourceIds) {
        const original = inventory.find((i) => i.item_id === sourceId);
        if (original) {
          await unwrapAction(saveItemEdits(sourceId, { quantity: original.quantity })).catch(
            () => undefined,
          );
        }
      }
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not send this offer");
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
          onYouGiveChange={handleOfferedChange}
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
            >{t("inventory.cancel")}</Button>
            <Button onPress={confirmSplit}>{t("offer.addToOffer")}</Button>
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
      <ActionBar layout="summary" className="p-3">
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
      </ActionBar>
    </div>
  );
}
