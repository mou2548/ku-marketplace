import { ArrowRight, Coins } from "lucide-react";

import type { Item } from "@/lib/api/types";
import { ITEM_CONDITION } from "@/lib/status";
import { cn } from "@/lib/utils";

import { PostImage } from "./post-image";

/**
 * What is on the table, both sides, with photos.
 *
 * A review of the built product found the offer list showing only counts —
 * "1 item + ฿2,000". Research P3 and design principle 6 both say a trade is a
 * comparison: fairness is judged by looking at two piles, not by reading two
 * numbers. So the piles are the summary.
 *
 * Compact enough to sit in a list row, and it reuses `PostImage`, so a photo
 * that fails to load degrades the same way it does on a feed card instead of
 * leaving a hole.
 */
export function OfferSummary({
  offered,
  wanted,
  additionalMoney,
  size = "md",
  className,
}: {
  /** What the proposer puts up. */
  offered: Item[];
  /** What they want in return — the post's item. */
  wanted: Item[];
  additionalMoney: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const thumb = size === "sm" ? "w-16" : "w-24";

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Stack items={offered} label="Offered" thumb={thumb} />

      <div className="flex shrink-0 flex-col items-center gap-1">
        <ArrowRight aria-hidden className="size-5 text-ink-muted" />
        {additionalMoney > 0 ? (
          <span
            data-numeric
            className="flex items-center gap-1 rounded-pill bg-tone-trade-bg px-2 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap text-tone-trade-fg"
          >
            <Coins aria-hidden className="size-3" />+฿
            {additionalMoney.toLocaleString("en-GB")}
          </span>
        ) : null}
      </div>

      <Stack items={wanted} label="In return for" thumb={thumb} />
    </div>
  );
}

function Stack({
  items,
  label,
  thumb,
}: {
  items: Item[];
  label: string;
  thumb: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[0.6875rem] font-semibold tracking-[0.09em] text-ink-muted uppercase">
        {label}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const rarity = ITEM_CONDITION[item.condition];
          return (
            <li key={item.item_id} className={cn("shrink-0", thumb)}>
              <span
                className="block overflow-hidden rounded-slot ring-2"
                style={{ boxShadow: `0 0 0 2px ${rarity.edge}` }}
              >
                <PostImage
                  src={item.images.find((i) => i.is_primary)?.image_url}
                  alt={item.name}
                  aspectRatio={1}
                  sizes="96px"
                />
              </span>
              <span className="mt-1 block truncate text-[0.6875rem] text-ink-muted">
                {item.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
