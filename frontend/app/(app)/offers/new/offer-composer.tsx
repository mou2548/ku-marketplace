"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Package } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { Surface } from "@/components/kit/surface";
import { TradeBench, TradeSourcePanel } from "@/components/kit/trade-bench";
import type { InventoryItem } from "@/components/kit/inventory-slot";
import { useToast } from "@/components/kit/toast";
import type { Item, Post } from "@/lib/api/types";

/**
 * Persona P3, design principle 6.
 *
 * The old flow was a checkbox list plus a number field, which makes fairness
 * impossible to judge — you cannot compare two piles you can only read. Here
 * the piles are the interface: drag from your stash onto the table, watch the
 * cash gap in the middle, and the answer to "is this fair?" is visible without
 * reading a label.
 *
 * On mobile the stash sits below the bench rather than beside it; the drag
 * still works, and so does the keyboard path react-aria-components provides.
 */
export function OfferComposer({
  post,
  inventory,
}: {
  post: Post;
  inventory: Item[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [offered, setOffered] = useState<InventoryItem[]>([]);
  const [money, setMoney] = useState(0);
  const [busy, setBusy] = useState(false);

  const stash: InventoryItem[] = useMemo(
    () =>
      inventory.map((i) => ({
        item_id: i.item_id,
        name: i.name,
        quantity: i.quantity,
        condition: i.condition,
        category: i.category,
        image_url: i.images[0]?.image_url ?? null,
      })),
    [inventory],
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

  async function submit() {
    setBusy(true);
    // POST /posts/{id}/offers → { item_ids, additional_money }
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show("Offer sent. Waiting on the post owner.");
    router.push("/offers");
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
        inventory={stash}
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
        onAdd={(item) =>
          setOffered((list) =>
            list.some((i) => i.item_id === item.item_id) ? list : [...list, item],
          )
        }
      />

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
