import { useTranslations } from "next-intl";
import { ArrowLeftRight, Coins } from "lucide-react";

import type { Item } from "@/lib/api/types";
import type { MoneyDirection } from "@/lib/offers";
import { ITEM_CONDITION } from "@/lib/status";
import { cn } from "@/lib/utils";

import { PostImage } from "./post-image";

/**
 * What is on the table, both sides, with photos — from the viewer's side.
 *
 * A review of the built product found the offer list showing only counts —
 * "1 item + ฿2,000". Research P3 and design principle 6 both say a trade is a
 * comparison: fairness is judged by looking at two piles, not by reading two
 * numbers. So the piles are the summary.
 *
 * The sides are always the viewer's, in the same order as the detail screen:
 * what you get, then what you give. They used to be the proposer's here and
 * the viewer's there, so opening a card swapped the piles round.
 *
 * The cash belongs to a side rather than to the gap between them. Money moves
 * one way — it leaves the proposer and arrives at the owner — so it sits in the
 * pile it travels with, and each side then lists everything that moves that
 * way.
 *
 * Compact enough to sit in a list row, and it reuses `PostImage`, so a photo
 * that fails to load degrades the same way it does on a feed card instead of
 * leaving a hole.
 */
export function OfferSummary({
  youGet,
  youGive,
  money,
  moneyDirection,
  size = "md",
  className,
}: {
  /** What comes to the viewer. */
  youGet: Item[];
  /** What leaves the viewer. */
  youGive: Item[];
  money: number;
  moneyDirection: MoneyDirection;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useTranslations();
  const thumb = size === "sm" ? "w-16" : "w-24";

  return (
    <div className={cn("flex flex-wrap items-start gap-3", className)}>
      <Stack
        items={youGet}
        label={t("offer.youGet")}
        thumb={thumb}
        money={moneyDirection === "you-receive" ? money : 0}
      />

      <span
        aria-hidden
        className="mt-6 grid size-8 shrink-0 place-items-center rounded-pill bg-tone-trade-bg text-tone-trade-fg"
      >
        <ArrowLeftRight className="size-4" />
      </span>

      <Stack
        items={youGive}
        label={t("offer.youGive")}
        thumb={thumb}
        money={moneyDirection === "you-pay" ? money : 0}
      />
    </div>
  );
}

function Stack({
  items,
  label,
  thumb,
  money,
}: {
  items: Item[];
  label: string;
  thumb: string;
  /** Cash travelling with this pile. Zero renders nothing. */
  money: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-overline text-ink-muted uppercase">
        {label}
      </span>
      <ul className="flex flex-wrap items-start gap-1.5">
        {items.map((item) => {
          const rarity = ITEM_CONDITION[item.condition];
          return (
            <li key={item.item_id} className={cn("shrink-0", thumb)}>
              <span
                className="block overflow-hidden rounded-slot ring-2 ring-[var(--slot-edge)]"
                style={{ "--slot-edge": rarity.edge } as React.CSSProperties}
              >
                <PostImage
                  src={item.images.find((i) => i.is_primary)?.image_url}
                  alt={item.name}
                  aspectRatio={1}
                  sizes="96px"
                />
              </span>
              <span className="mt-1 block truncate text-meta text-ink-muted">
                {item.name}
              </span>
            </li>
          );
        })}

        {money > 0 ? (
          <li className="shrink-0">
            <span
              data-numeric
              className="flex items-center gap-1 rounded-pill bg-tone-trade-bg px-2.5 py-1 text-caption font-semibold whitespace-nowrap text-tone-trade-fg"
            >
              <Coins aria-hidden className="size-3.5" />+฿
              {money.toLocaleString("en-GB")}
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
