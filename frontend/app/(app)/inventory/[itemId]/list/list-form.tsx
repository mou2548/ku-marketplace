"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Coins, Sparkles, Store } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
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
    // POST /posts → { item_id, post_type, price, quantity_total }
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show("Listed. It is live in the market now.");
    router.push("/market");
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
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
