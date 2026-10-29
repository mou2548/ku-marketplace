import { getCopy } from "@/lib/copy";
import { notFound } from "next/navigation";

import { PostImage } from "@/components/kit/post-image";
import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import { getItemHistorySummary, getMyItems } from "@/lib/api/items";
import { getMe } from "@/lib/api/users";
import { freeUnits } from "@/lib/item-availability";
import { ITEM_CONDITION } from "@/lib/status";

import { ListItemForm } from "./list-form";

export const metadata = { title: "List an item - KU Marketplace" };

/**
 * E5 — put an owned item on the market. Always a new listing: an item can
 * carry several open channels at once now (a sale post and a trade post
 * together, say), so this route never looks for an existing post to reuse —
 * editing one already on the market happens at
 * `/inventory/[itemId]/list/[postId]` instead.
 *
 * Separate from the item form on purpose (schema §2.4): an item is a thing you
 * own, a post is the terms you are offering it under. The same item can go up
 * for sale this month and for trade the next, so the terms cannot live on the
 * item.
 */
export default async function ListItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const tStatus = await getCopy("status");
  const t = await getCopy();
  const { itemId } = await params;
  const [items, summary, me] = await Promise.all([
    getMyItems(),
    getItemHistorySummary(Number(itemId)).catch(() => undefined),
    // Only decides whether to show the PromptPay notice; the API has the
    // final say, so a failed lookup leaves the form as it was.
    getMe().catch(() => undefined),
  ]);
  const item = items.find((i) => i.item_id === Number(itemId));
  if (!item) notFound();
  // Same count as the inventory card and /post: 0 for a handed-over item.
  const available = freeUnits(item, summary);

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
      <ListItemForm item={item} available={available} hasPromptPay={me ? !!me.promptpayId : true} />
    </TwoColumn>
  );
}
