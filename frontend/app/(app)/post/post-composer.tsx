"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Check,
  Coins,
  Gift,
  Package,
  Plus,
  Sparkles,
  Store,
} from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import type { Item } from "@/lib/api/types";
import { ITEM_CONDITION, POST_TYPE, type PostType } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Pick, set terms, publish — on one screen.
 *
 * Multi-select is here because persona P2 clears a dorm room in a weekend and
 * posting twelve things one form at a time is the reason people give up
 * halfway. Terms apply to the whole selection; anything that needs different
 * terms is a second pass, which is still faster than twelve forms.
 */
export function PostComposer({
  items,
  listedItemIds,
}: {
  items: Item[];
  listedItemIds: number[];
}) {
  const router = useRouter();
  const toast = useToast();
  const listed = useMemo(() => new Set(listedItemIds), [listedItemIds]);

  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [postType, setPostType] = useState<PostType>("SellOnly");
  const [price, setPrice] = useState("");
  const [wanted, setWanted] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const unlisted = items.filter((i) => !listed.has(i.item_id));
  const alreadyListed = items.filter((i) => listed.has(i.item_id));

  const wantsPrice = postType !== "TradeOnly";
  const wantsTradeTerms = postType !== "SellOnly";
  const canPublish =
    picked.size > 0 && (!wantsPrice || Number(price) > 0);

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function publish() {
    setBusy(true);
    // POST /posts, once per selected item
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(
      picked.size === 1
        ? "Listed. It is live in the market now."
        : `Listed ${picked.size} items. They are live in the market now.`,
    );
    router.push("/");
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Surface
          shape="card"
          elevation="flat"
          fill="none"
          className="texture-grid flex flex-col items-center gap-3 px-6 py-12 text-center"
        >
          <span className="grid size-12 place-items-center rounded-pill bg-brand-subtle text-ink-brand">
            <Package aria-hidden className="size-5" />
          </span>
          <p className="max-w-sm text-[0.9375rem] leading-[1.7] text-ink-muted">
            You have nothing in your inventory yet. Add an item and you can list
            it from here straight away.
          </p>
          <LinkButton href="/inventory/new">
            <Plus className="size-4" />
            Add an item
          </LinkButton>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          Post to the market
        </h1>
        <p className="text-[0.9375rem] leading-[1.7] text-ink-muted">
          Pick what you want to list, set the terms once, publish.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[0.6875rem] font-semibold tracking-[0.09em] text-ink-muted uppercase">
            Your items
          </h2>
          <Link
            href="/inventory/new"
            className="flex items-center gap-1 text-[0.875rem] font-medium text-ink-brand hover:underline"
          >
            <Plus aria-hidden className="size-4" />
            Add a new item
          </Link>
        </div>

        {unlisted.length === 0 ? (
          <Surface
            shape="card"
            elevation="flat"
            className="bg-brand-subtle p-4 text-[0.875rem] leading-[1.7] text-ink-secondary"
          >
            Everything you own is already on the market. Add a new item to list
            something else.
          </Surface>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {unlisted.map((item) => (
              <li key={item.item_id}>
                <ItemPick
                  item={item}
                  isPicked={picked.has(item.item_id)}
                  onToggle={() => toggle(item.item_id)}
                />
              </li>
            ))}
          </ul>
        )}

        {alreadyListed.length > 0 ? (
          <details className="text-[0.8125rem] text-ink-muted">
            <summary className="cursor-pointer">
              {alreadyListed.length} already on the market
            </summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {alreadyListed.map((item) => (
                <li key={item.item_id} className="flex items-center gap-2">
                  <span className="truncate">{item.name}</span>
                  <StatusBadge
                    status={POST_TYPE.SellOnly}
                    size="sm"
                    iconOnly
                    className="shrink-0"
                  />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {/* Terms only appear once something is picked: an empty form above an
          empty selection is two decisions presented as one. */}
      {picked.size > 0 ? (
        <section className="flex flex-col gap-5 border-t border-line pt-5">
          <RadioGroupField
            label="What kind of listing is this"
            value={postType}
            onChange={(v) => setPostType(v as PostType)}
            variant="card"
          >
            <Radio value="SellOnly" description="Cash only, no trades">
              <span className="flex items-center gap-2">
                <Store aria-hidden className="size-4" />
                {POST_TYPE.SellOnly.label}
              </span>
            </Radio>
            <Radio value="TradeOnly" description="Trades only, not for sale">
              <span className="flex items-center gap-2">
                <ArrowLeftRight aria-hidden className="size-4" />
                {POST_TYPE.TradeOnly.label}
              </span>
            </Radio>
            <Radio
              value="Both"
              description="Buy it or trade for it. One post accepts both."
            >
              <span className="flex items-center gap-2">
                <Sparkles aria-hidden className="size-4" />
                {POST_TYPE.Both.label}
              </span>
            </Radio>
          </RadioGroupField>

          {wantsPrice ? (
            <TextInput
              label="Price"
              value={price}
              onChange={(v) => setPrice(v.replace(/\D/g, ""))}
              inputMode="numeric"
              isRequired
              icon={<Coins className="size-4" />}
              suffix={<span className="text-[0.8125rem]">THB</span>}
              hint={
                picked.size > 1
                  ? "This price applies to every item you selected. List them separately if they should differ."
                  : undefined
              }
            />
          ) : null}

          {wantsTradeTerms ? (
            <TextAreaField
              label="What do you want in trade"
              value={wanted}
              onChange={setWanted}
              rows={3}
              placeholder="e.g. Chemistry 1 textbook, or Calculus 2 notes"
              hint="Being specific filters out a lot of offers that miss the mark"
            />
          ) : null}

          <TextAreaField
            label="Listing description"
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder="Meetup conditions, times that suit you, or anything else worth saying"
          />
        </section>
      ) : null}

      <Surface
        shape="card"
        className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-[20] flex flex-wrap items-center gap-3 p-3"
      >
        <p className="min-w-0 flex-1 text-[0.875rem]">
          {picked.size === 0 ? (
            <span className="text-ink-muted">Pick at least one item</span>
          ) : (
            <span data-numeric className="font-medium">
              {picked.size} selected
            </span>
          )}
        </p>

        <LinkButton variant="ghost" size="sm" href="/giveaway/new">
          <Gift className="size-4" />
          Give away instead
        </LinkButton>

        <Button
          size="lg"
          isDisabled={!canPublish}
          isLoading={busy}
          onPress={publish}
        >
          <Store className="size-5" />
          Publish
        </Button>
      </Surface>
    </div>
  );
}

function ItemPick({
  item,
  isPicked,
  onToggle,
}: {
  item: Item;
  isPicked: boolean;
  onToggle: () => void;
}) {
  const rarity = ITEM_CONDITION[item.condition];
  const primary = item.images.find((i) => i.is_primary) ?? item.images[0];

  return (
    <button
      type="button"
      aria-pressed={isPicked}
      onClick={onToggle}
      className="w-full text-left"
    >
      <Surface
        as="div"
        shape="card"
        elevation={isPicked ? "floating" : "raised"}
        className={cn(
          "flex items-center gap-3 p-3 transition-shadow",
          isPicked && "ring-2 ring-brand",
        )}
      >
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-[0.375rem]",
            isPicked
              ? "bg-brand text-on-brand shadow-raised"
              : "bg-surface-sunken shadow-sunken",
          )}
        >
          {isPicked ? (
            <Check aria-hidden className="size-3.5" strokeWidth={3} />
          ) : null}
        </span>

        <span
          className="block w-14 shrink-0 overflow-hidden rounded-slot"
          style={{ boxShadow: `0 0 0 2px ${rarity.edge}` }}
        >
          <PostImage src={primary?.image_url} alt="" aspectRatio={1} sizes="56px" />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[0.9375rem] font-semibold">
            {item.name}
          </span>
          <span className="truncate text-[0.8125rem] text-ink-muted">
            {item.category}
            <span aria-hidden> · </span>
            <span style={{ color: rarity.fg }}>{rarity.label}</span>
          </span>
        </span>
      </Surface>
    </button>
  );
}
