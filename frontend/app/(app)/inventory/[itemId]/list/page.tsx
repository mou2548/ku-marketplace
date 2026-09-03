import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PostImage } from "@/components/kit/post-image";
import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import { getMyItems } from "@/lib/api/items";
import { ITEM_CONDITION } from "@/lib/status";

import { ListItemForm } from "./list-form";

/**
 * E5 — put an owned item on the market.
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
  const t = await getTranslations("status");
  const { itemId } = await params;
  const items = await getMyItems();
  const item = items.find((i) => i.item_id === Number(itemId));
  if (!item) notFound();

  const rarity = ITEM_CONDITION[item.condition];

  /**
   * The thing being listed, beside the terms. Setting a price for an item you
   * cannot see is the one thing this screen must not ask for.
   */
  const preview = (
    <Surface shape="card" className="flex w-full max-w-md flex-col gap-3 p-5 mx-auto">
      <p className="text-overline text-ink-muted uppercase">
        What you are listing
      </p>

      <span
        className="block w-full overflow-hidden rounded-slot ring-2 ring-[var(--slot-edge)]"
        style={{ "--slot-edge": rarity.edge } as React.CSSProperties}
      >
        <PostImage
          src={item.images.find((i) => i.is_primary)?.image_url}
          alt=""
          aspectRatio={1}
          sizes="320px"
          className="!aspect-square"
        />
      </span>

      <p className="font-semibold">{item.name}</p>

      <dl className="flex flex-col gap-2 border-t border-line pt-3 text-caption">
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Category</dt>
          <dd>{item.category}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Condition</dt>
          {/* tokens.md §5 bans rarity as free-floating coloured text: it is
              a rim on a slot or a chip, never a tinted word in a spec list. */}
          <dd>{t(rarity.labelKey)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Quantity</dt>
          <dd data-numeric>{item.quantity}</dd>
        </div>
      </dl>

      {item.description ? (
        <p className="border-t border-line pt-3 text-caption leading-[1.6] text-ink-muted">
          {item.description}
        </p>
      ) : null}
    </Surface>
  );

  return (
    <TwoColumn rail={preview} columns="minmax(0,1fr) minmax(0,1fr)">
      <ListItemForm item={item} />
    </TwoColumn>
  );
}
