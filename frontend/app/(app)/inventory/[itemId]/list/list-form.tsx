"use client";

import { getCopy } from "@/lib/copy";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Coins, Gift, Sparkles, Store } from "lucide-react";

import { ActionBar } from "@/components/kit/action-bar";
import { Button } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { useStatusText } from "@/lib/status-text";
import { publishListing, updateListing } from "@/lib/actions/posts";
import { wireIdToNumber, type PostSummary } from "@/lib/api/posts";
import type { Item, Post } from "@/lib/api/types";
import { POST_TYPE, type PostType } from "@/lib/status";

/**
 * The brief asked for this choice to be explicit: sell, trade, or both in one
 * post. So it is the first field, as cards rather than a dropdown, and the
 * fields below it appear or disappear with the choice — a price field on a
 * trade-only post is a question with no right answer.
 *
 * `post` is the specific channel being edited, if any. Its presence is what
 * makes this screen an edit rather than a new listing — same fields, but
 * seeded from that post and saved with a `PATCH` instead of a `POST`. An
 * item can carry more than one open channel at once now, so creating a new
 * listing never looks for an existing post to reuse — it always adds one.
 */
export function ListItemForm({
  item,
  post,
  available,
  priceKnown = true,
}: {
  item: Item;
  post?: Post;
  /** How much of the item is still free to commit to a new (or bigger)
   * channel — the ceiling for a new listing's quantity, and how far this
   * one can grow if edited. */
  available?: number;
  /** False when editing a channel whose current price could not be loaded
   * (a sold-out post drops out of the public endpoint this reads from) —
   * the price field starts empty instead of seeding a wrong "0". */
  priceKnown?: boolean;
}) {
  const t = getCopy();
  const st = useStatusText();
  const router = useRouter();
  const toast = useToast();
  const isEditing = !!post;
  const freeStock = available ?? item.quantity;
  // Editing: this channel can shrink down to what it already sold/traded
  // (never below), and grow by however much is still free elsewhere.
  const soldOnThisChannel = post ? post.quantity_total - post.quantity_remaining : 0;
  const minQuantity = isEditing ? soldOnThisChannel : 1;
  const maxQuantity = isEditing ? (post?.quantity_total ?? 0) + freeStock : freeStock;

  const [postType, setPostType] = useState<PostType>(post?.post_type ?? "SellOnly");
  const [price, setPrice] = useState(
    post && post.post_type !== "TradeOnly" && priceKnown ? String(post.price) : "",
  );
  const [quantity, setQuantity] = useState(
    String(isEditing ? (post?.quantity_total ?? maxQuantity) : maxQuantity),
  );
  const [wanted, setWanted] = useState(post?.wanted_item_offer ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [busy, setBusy] = useState(false);

  const wantsPrice = postType !== "TradeOnly";
  const wantsTradeTerms = postType !== "SellOnly";
  const quantityValue = Number(quantity);
  const quantityValid =
    Number.isInteger(quantityValue) &&
    quantityValue >= minQuantity &&
    quantityValue <= maxQuantity;
  const canPost = (!wantsPrice || Number(price) > 0) && quantityValid;

  async function publish() {
    setBusy(true);
    try {
      if (isEditing) {
        await updateListing(post.post_id, {
          post_type: postType,
          price: wantsPrice ? Number(price) : 0,
          quantity_total: quantityValue,
          description: description.trim() || undefined,
          wanted_item_offer: wantsTradeTerms ? wanted.trim() || undefined : undefined,
        });
        setBusy(false);
        toast.success("Listing updated.");
        router.push(`/market/${post.post_id}`);
        return;
      }
      const created: PostSummary = await publishListing({
        item_id: item.item_id,
        post_type: postType,
        // A trade-only post still needs a number the API will accept; the
        // asking price is meaningless there and the field is hidden for it.
        price: wantsPrice ? Number(price) : 0,
        quantity_total: quantityValue,
        description: description.trim() || undefined,
        wanted_item_offer: wantsTradeTerms ? wanted.trim() || undefined : undefined,
      });
      setBusy(false);
      toast.success("Listed. It is live in the market now.");
      router.push(`/market/${wireIdToNumber(created.post_id)}`);
    } catch (err) {
      setBusy(false);
      toast.error(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Could not update this listing"
            : "Could not list this item",
      );
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Link
        href={`/inventory/${item.item_id}`}
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />{t("inventory.backToItem")}</Link>

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-overline font-semibold text-ink-brand uppercase">
            {t("inventory.whatListing")}
          </p>
          <h1 className="mt-1 text-h1">
            {isEditing ? t("inventory.editListing") : t("inventory.listAnItem")}
          </h1>
          <p className="mt-1 truncate text-body-sm text-ink-muted">{item.name}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push(`/inventory/${item.item_id}/edit`)}
        >{t("inventory.editItem")}</Button>
      </header>

      <Surface shape="panel" className="flex flex-col gap-5 p-4 sm:p-5">
        <RadioGroupField
          label={t("listing.kind")}
          value={postType}
          onChange={(v) => {
            if (v === "Giveaway") {
              // A giveaway is a different table with its own form (pickup
              // location, allocation method, dates) — reuse that screen
              // instead of duplicating it here, with this item preselected.
              router.push(`/post?type=giveaway&item=${item.item_id}`);
              return;
            }
            setPostType(v as PostType);
          }}
          variant="card"
        >
          <Radio value="SellOnly" description={t("listing.sellOnly")}>
            <span className="flex items-center gap-2">
              <Store aria-hidden className="size-4" />
              {st.of(POST_TYPE.SellOnly).label}
            </span>
          </Radio>
          <Radio value="TradeOnly" description={t("listing.tradeOnly")}>
            <span className="flex items-center gap-2">
              <ArrowLeftRight aria-hidden className="size-4" />
              {st.of(POST_TYPE.TradeOnly).label}
            </span>
          </Radio>
          <Radio value="Both" description={t("listing.both")}>
            <span className="flex items-center gap-2">
              <Sparkles aria-hidden className="size-4" />
              {st.of(POST_TYPE.Both).label}
            </span>
          </Radio>
          {!isEditing ? (
            <Radio value="Giveaway" description="Free — set pickup and registration details on the next screen">
              <span className="flex items-center gap-2">
                <Gift aria-hidden className="size-4" />
                Give away
              </span>
            </Radio>
          ) : null}
        </RadioGroupField>

        <TextInput
          label={t("listing.quantity")}
          value={quantity}
          onChange={(v) => setQuantity(v.replace(/\D/g, ""))}
          inputMode="numeric"
          isRequired
          hint={
            isEditing
              ? soldOnThisChannel > 0
                ? `${minQuantity}–${maxQuantity} — can't go below what's already sold or traded here`
                : `Up to ${maxQuantity} total`
              : t("listing.quantityHint", { count: maxQuantity })
          }
        />

        {wantsPrice ? (
          <TextInput
            label={t("listing.price")}
            value={price}
            onChange={(v) => setPrice(v.replace(/\D/g, ""))}
            inputMode="numeric"
            isRequired
            icon={<Coins className="size-4" />}
            suffix={<span className="text-caption">{t("listing.thb")}</span>}
            hint={
              !priceKnown
                ? "This listing is sold out, so its current price could not be loaded — enter the price you want it to have."
                : postType === "Both"
                  ? t("listing.priceHintBoth")
                  : undefined
            }
          />
        ) : null}

        {wantsTradeTerms ? (
          <TextAreaField
            label={t("listing.wantInTrade")}
            value={wanted}
            onChange={setWanted}
            rows={3}
            placeholder={t("listing.wantPlaceholder")}
            hint={t("listing.wantHint")}
          />
        ) : null}

        <TextAreaField
          label={t("listing.description")}
          value={description}
          onChange={setDescription}
          rows={4}
          placeholder={t("listing.descPlaceholder")}
        />
      </Surface>

      <ActionBar>
        <Button variant="secondary" block onPress={() => router.back()}>{t("inventory.cancel")}</Button>
        <Button
          block
          size="lg"
          isDisabled={!canPost}
          isLoading={busy}
          onPress={publish}
        >
          <Store aria-hidden className="size-4" />
          {isEditing ? t("inventory.saveChanges") : t("inventory.publish")}
        </Button>
      </ActionBar>
    </div>
  );
}
