"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Coins, Sparkles, Store } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { publishListing } from "@/lib/actions/posts";
import { postIdToNumber, type PostSummary } from "@/lib/api/posts";
import type { Item } from "@/lib/api/types";
import { ITEM_CONDITION, POST_TYPE, type PostType } from "@/lib/status";

/**
 * The brief asked for this choice to be explicit: sell, trade, or both in one
 * post. So it is the first field, as cards rather than a dropdown, and the
 * fields below it appear or disappear with the choice — a price field on a
 * trade-only post is a question with no right answer.
 */
export function ListItemForm({ item }: { item: Item }) {
  const router = useRouter();
  const toast = useToast();

  const [postType, setPostType] = useState<PostType>("SellOnly");
  const [price, setPrice] = useState("");
  const [wanted, setWanted] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const wantsPrice = postType !== "TradeOnly";
  const wantsTradeTerms = postType !== "SellOnly";
  const canPost = !wantsPrice || Number(price) > 0;

  async function publish() {
    setBusy(true);
    let post: PostSummary;
    try {
      post = await publishListing({
        item_id: item.item_id,
        post_type: postType,
        // A trade-only post still needs a number the API will accept; the
        // asking price is meaningless there and the field is hidden for it.
        price: wantsPrice ? Number(price) : 0,
        quantity_total: item.quantity,
      });
    } catch (err) {
      setBusy(false);
      toast.show(err instanceof Error ? err.message : "Could not list this item");
      return;
    }
    setBusy(false);
    toast.show("Listed. It is live in the market now.");
    router.push(`/market/${postIdToNumber(post.post_id)}`);
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Link
        href={`/inventory/${item.item_id}`}
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to item
      </Link>

      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        List an item
      </h1>

      <Surface shape="card" className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.name}</p>
          <p
            className="text-[0.8125rem] text-[var(--slot-edge)]"
            style={
              {
                "--slot-edge": ITEM_CONDITION[item.condition].fg,
              } as React.CSSProperties
            }
          >
            {ITEM_CONDITION[item.condition].label} · {item.quantity} in stock
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push(`/inventory/${item.item_id}/edit`)}
        >
          Edit item
        </Button>
      </Surface>

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
            postType === "Both"
              ? "This price applies to a direct purchase. Someone offering a trade proposes their own cash difference."
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
        rows={4}
        placeholder="Meetup conditions, times that suit you, or anything else worth saying"
      />

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[20] flex gap-2 lg:static">
        <Button variant="secondary" block onPress={() => router.back()}>
          Cancel
        </Button>
        <Button
          block
          size="lg"
          isDisabled={!canPost}
          isLoading={busy}
          onPress={publish}
        >
          <StatusBadge status={POST_TYPE[postType]} size="sm" iconOnly />
          Publish listing
        </Button>
      </div>
    </div>
  );
}
