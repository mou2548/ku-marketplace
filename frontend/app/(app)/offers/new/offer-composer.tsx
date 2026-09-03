"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, CheckCircle2, Package } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { TextInput } from "@/components/kit/field";
import { Overlay } from "@/components/kit/overlay";
import { Surface } from "@/components/kit/surface";
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
      <Surface
        shape="card"
        className="flex flex-col gap-3 border-l-4 border-l-tone-success-solid bg-tone-success-bg p-5"
      >
        <p className="flex items-center gap-2 text-[1.0625rem] font-semibold text-tone-success-fg">
          <CheckCircle2 aria-hidden className="size-5 shrink-0" />
          Offer sent
        </p>
        <p className="text-[0.875rem] leading-[1.7] text-ink-secondary">
          You offered {post.seller.name}{" "}
          {offered.length > 0
            ? `${offered.length} ${offered.length === 1 ? "item" : "items"}`
            : "no items"}
          {money > 0 ? ` plus ฿${money.toLocaleString("en-GB")}` : ""} for{" "}
          {post.item.name}. They will see it and can accept or decline.
        </p>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/market">Keep browsing</LinkButton>
          <LinkButton variant="secondary" href="/offers">
            My offers
          </LinkButton>
        </div>
      </Surface>
    );
  }

  if (stash.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-6" />}
        title="Your inventory is empty"
        description="You need items in your inventory before you can offer a trade. Add some, then come back to this post."
        action={
          <LinkButton href="/inventory/new">Add an item</LinkButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/market/${post.post_id}`}
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to listing
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          Offer a trade for {post.item.name}
        </h1>
        {post.wanted_item_offer ? (
          <p className="text-[0.875rem] leading-[1.65] text-ink-muted">
            The owner wants: {post.wanted_item_offer}
          </p>
        ) : null}
      </header>

      <TradeBench
        youGet={wanted}
        youGive={offered}
        onYouGiveChange={setOffered}
        additionalMoney={money}
        onAdditionalMoneyChange={setMoney}
        // Composing an offer, you are always the one putting the cash up.
        moneyDirection="you-pay"
        counterpartyName={post.seller.name}
      />

      <TradeSourcePanel
        inventory={stash}
        offeredIds={offeredIds}
        onAdd={tapStash}
      />

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
            >
              Cancel
            </Button>
            <Button isLoading={splitBusy} onPress={confirmSplit}>
              Add to offer
            </Button>
          </>
        }
      >
        <TextInput
          label="Quantity to offer"
          value={splitQty}
          onChange={(v) => setSplitQty(v.replace(/\D/g, ""))}
          inputMode="numeric"
          hint={splitTarget ? `Max ${splitTarget.quantity}` : undefined}
        />
      </Overlay>

      {/* Sticky on mobile: the submit must not be below a scrolling stash. */}
      <Surface
        shape="card"
        className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[20] flex items-center gap-3 p-3 lg:static"
      >
        {/* Same phrasing as the review screen and the inbox card, so what you
            are about to send reads the way it will read once it is sent. */}
        <p className="min-w-0 flex-1 text-[0.8125rem] text-ink-muted">
          {offered.length > 0
            ? `You give ${offered.length} ${offered.length === 1 ? "item" : "items"}`
            : "Nothing on the table yet"}
          {money > 0 ? ` plus ฿${money.toLocaleString("en-GB")}` : ""}
        </p>
        <Button size="lg" isDisabled={!canSubmit} isLoading={busy} onPress={submit}>
          <ArrowLeftRight className="size-5" />
          Send offer
        </Button>
      </Surface>
    </div>
  );
}
