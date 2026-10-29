import { getCopy } from "@/lib/copy";
import { notFound } from "next/navigation";

import { PostImage } from "@/components/kit/post-image";
import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import { getItemHistorySummary, getMyItems } from "@/lib/api/items";
import { getMe } from "@/lib/api/users";
import { getPost } from "@/lib/api/posts";
import type { Post } from "@/lib/api/types";
import { ITEM_CONDITION } from "@/lib/status";

import { ListItemForm } from "../list-form";

export const metadata = { title: "Edit listing - KU Marketplace" };

/**
 * E5 — edit the terms of one specific channel already on the market for this
 * item. Keyed by `post_id`, not `item_id`: an item can carry more than one
 * open channel at once now, so routing by item alone could open the wrong
 * one (see `market/[postId]/post-actions.tsx`'s "Edit listing" link, which
 * points here with the exact post_id for the same reason).
 */
export default async function EditListItemPage({
  params,
}: {
  params: Promise<{ itemId: string; postId: string }>;
}) {
  const tStatus = await getCopy("status");
  const t = await getCopy();
  const { itemId, postId } = await params;
  const [items, publicPost, summary, me] = await Promise.all([
    getMyItems(),
    // GET /posts/:id is the public listing endpoint — it filters to
    // quantityRemaining > 0, so a sold-out channel (still open, still worth
    // editing — the owner may want to raise the price back up, say) 404s
    // here even though it is real. Falls back to the channel data from the
    // history summary below rather than treating that as "not found".
    getPost(postId).catch(() => undefined),
    getItemHistorySummary(Number(itemId)).catch(() => undefined),
    // Only decides whether to show the PromptPay notice; the API has the
    // final say, so a failed lookup leaves the form as it was.
    getMe().catch(() => undefined),
  ]);
  const item = items.find((i) => i.item_id === Number(itemId));
  const channel = summary?.channels.find(
    (c) => c.type === "post" && c.post_id === Number(postId),
  );
  if (!item || (!publicPost && !channel)) notFound();
  if (publicPost && publicPost.item_id !== item.item_id) notFound();

  const priceKnown = !!publicPost;
  const post: Post =
    publicPost ??
    // Sold out: no public price to seed the form with, so the owner
    // re-enters it (list-form.tsx shows a hint explaining why).
    ({
      post_id: Number(postId),
      item_id: item.item_id,
      post_type: (channel as Extract<typeof channel, { type: "post" }>).post_type,
      price: 0,
      quantity_total: (channel as Extract<typeof channel, { type: "post" }>)
        .quantity_total,
      quantity_remaining: (channel as Extract<typeof channel, { type: "post" }>)
        .quantity_remaining,
      description: null,
      wanted_item_offer: null,
      created_at: "",
      item,
      seller: { user_id: item.owner_id, name: "", isVerified: false },
    } satisfies Post);

  const rarity = ITEM_CONDITION[item.condition];

  /**
   * The thing being listed, beside the terms. Setting a price for an item you
   * cannot see is the one thing this screen must not ask for.
   */
  const preview = (
    <Surface shape="panel" className="mx-auto flex w-full max-w-md flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        <PostImage
          src={item.images.find((i) => i.is_primary)?.image_url}
          alt={item.name}
          aspectRatio={4 / 3}
          sizes="320px"
          className="h-full"
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1 bg-[var(--slot-edge)]"
          style={{ "--slot-edge": rarity.edge } as React.CSSProperties}
        />
      </div>

      <div className="flex flex-col gap-3 p-5">
        <p className="text-overline font-semibold text-ink-brand uppercase">
          {t("inventory.whatListing")}
        </p>
        <p className="text-h3">{item.name}</p>

        <dl className="flex flex-col gap-2 border-t border-line pt-3 text-caption">
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">{t("inventory.category")}</dt>
          <dd>{item.category}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">{t("inventory.condition")}</dt>
          {/* tokens.md §5 bans rarity as free-floating coloured text: it is
              a rim on a slot or a chip, never a tinted word in a spec list. */}
          <dd>{tStatus(rarity.labelKey)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">{t("inventory.quantity")}</dt>
          <dd data-numeric>{item.quantity}</dd>
        </div>
        </dl>

        {item.description ? (
          <p className="border-t border-line pt-3 text-caption leading-[1.6] text-ink-muted">
            {item.description}
          </p>
        ) : null}
      </div>
    </Surface>
  );

  return (
    <TwoColumn
      rail={<div className="hidden lg:block">{preview}</div>}
      railSide="left"
      columns="22rem minmax(0,1fr)"
      className="gap-8"
    >
      <ListItemForm
        item={item}
        post={post}
        priceKnown={priceKnown}
        available={summary?.available_quantity ?? 0}
        hasPromptPay={me ? !!me.promptpayId : true}
      />
    </TwoColumn>
  );
}
