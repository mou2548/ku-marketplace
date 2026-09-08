"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Coins, Sparkles, Store } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { useStatusText } from "@/lib/i18n/status-text";
import { publishListing } from "@/lib/actions/posts";
import { wireIdToNumber, type PostSummary } from "@/lib/api/posts";
import type { Item } from "@/lib/api/types";
import { POST_TYPE, type PostType } from "@/lib/status";

/**
 * The brief asked for this choice to be explicit: sell, trade, or both in one
 * post. So it is the first field, as cards rather than a dropdown, and the
 * fields below it appear or disappear with the choice — a price field on a
 * trade-only post is a question with no right answer.
 */
export function ListItemForm({ item }: { item: Item }) {
  const t = useTranslations();
  const st = useStatusText();
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
      toast.error(err instanceof Error ? err.message : "Could not list this item");
      return;
    }
    setBusy(false);
    toast.success("Listed. It is live in the market now.");
    router.push(`/market/${wireIdToNumber(post.post_id)}`);
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
          <h1 className="mt-1 text-h1">{t("inventory.listAnItem")}</h1>
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
          onChange={(v) => setPostType(v as PostType)}
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
        </RadioGroupField>

        {wantsPrice ? (
          <TextInput
            label={t("listing.price")}
            value={price}
            onChange={(v) => setPrice(v.replace(/\D/g, ""))}
            inputMode="numeric"
            isRequired
            icon={<Coins className="size-4" />}
            suffix={<span className="text-caption">{t("listing.thb")}</span>}
            hint={postType === "Both" ? t("listing.priceHintBoth") : undefined}
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

      <div className="sticky action-bar-bottom z-[20] flex gap-2 rounded-card bg-surface/95 p-2 shadow-floating backdrop-blur-sm lg:static lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        <Button variant="secondary" block onPress={() => router.back()}>{t("inventory.cancel")}</Button>
        <Button
          block
          size="lg"
          isDisabled={!canPost}
          isLoading={busy}
          onPress={publish}
        >
          <Store aria-hidden className="size-4" />{t("inventory.publish")}</Button>
      </div>
    </div>
  );
}
