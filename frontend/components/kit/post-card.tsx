import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeftRight, BookOpen } from "lucide-react";

import { ITEM_CONDITION, POST_TYPE, type ItemCondition, type PostType } from "@/lib/status";
import { useStatusText } from "@/lib/i18n/status-text";
import { cn } from "@/lib/utils";

import { PostImage } from "./post-image";
import { StatusIcon } from "./icon";
import { Surface } from "./surface";
import { TONE_SOLID } from "./tone";
import { TrustBadge } from "./trust-badge";

/**
 * The feed card. Heights vary with image aspect ratio and description length —
 * that variation is what makes the masonry grid look full rather than gridded.
 *
 * CLS discipline (budget: <= 0.05): the image well reserves its aspect ratio
 * via `aspect-[--card-ar]` before the image loads, so nothing reflows. The
 * aspect ratio is passed in, not measured.
 *
 * `course_name` is surfaced here because persona P1 searches by course code and
 * the field existed in the schema while being invisible in the old UI.
 */
export interface PostCardProps {
  postId: number;
  name: string;
  price: number;
  postType: PostType;
  condition: ItemCondition;
  imageUrl?: string | null;
  /** width / height of the primary image. Defaults to 4:5. */
  aspectRatio?: number;
  description?: string | null;
  courseName?: string | null;
  wantedItemOffer?: string | null;
  seller: { name: string; isVerified?: boolean; faculty?: string | null };
  className?: string;
}

export function PostCard({
  postId,
  name,
  price,
  postType,
  condition,
  imageUrl,
  aspectRatio = 0.8,
  description,
  courseName,
  wantedItemOffer,
  seller,
  className,
}: PostCardProps) {
  const st = useStatusText();
  const rarity = ITEM_CONDITION[condition];
  const t = useTranslations();
  const showsPrice = postType !== "TradeOnly";

  return (
    <Surface
      as="article"
      shape="card"
      interactive
      // The rarity rim is gone. It made condition one colour event per card
      // instead of five, which was the right answer to the question being
      // asked then — but CLAUDE.md §3.9 now confines rarity colour to
      // inventory and trade, and a feed is neither. Condition is still on the
      // card, in words, at the foot.
      className={cn("overflow-hidden", className)}
    >
      {/* The global :focus-visible rule paints --shadow-focus, a box-shadow,
          and the Surface above carries overflow-hidden, so the ring was
          clipped away on the one card in the product that is entirely a link.
          An inset ring is drawn inside the element and survives the clip. */}
      <Link
        href={`/market/${postId}`}
        className="block rounded-card outline-none focus-visible:[box-shadow:inset_0_0_0_2px_var(--ring)]"
      >
        <div className="relative">
          <PostImage src={imageUrl} alt={name} aspectRatio={aspectRatio} />
          {/* Only when the post accepts a trade.
              CLAUDE.md §4 gives trade its own hue precisely so a trade post
              separates from a sale post at a glance, so this badge keeps its
              fill. But a "Sell" badge on every card labels the default: a feed
              is mostly sale posts, so it painted a saturated block over every
              photograph and told the reader nothing. Sale is what a
              marketplace card means unless it says otherwise.

              No `shadow-raised`: its inset white top-highlight is meant for a
              flat card surface, and traced around this pill's full rounded
              edge as a visible white rim, worst over a photo. */}
          {postType !== "SellOnly" ? (
            <span
              className={cn(
                "pointer-events-none absolute top-2 left-2 flex items-center gap-1.5",
                "rounded-pill px-2.5 py-1 text-meta font-semibold",
                TONE_SOLID[POST_TYPE[postType].tone],
              )}
            >
              <StatusIcon name={POST_TYPE[postType].icon} className="size-3.5" />
              {st.of(POST_TYPE[postType]).label}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-[1rem] leading-[1.45] font-semibold text-ink">
            {name}
          </h3>

          {courseName ? (
            <span className="inline-flex w-fit items-center gap-1 rounded-chip bg-gray-100 px-2 py-0.5 text-meta font-medium text-ink-secondary">
              <BookOpen aria-hidden className="size-3" />
              {courseName}
            </span>
          ) : null}

          {description ? (
            <p className="line-clamp-2 text-caption leading-[1.6] font-normal text-ink-muted">
              {description}
            </p>
          ) : null}

          {/* A line, not a tinted block. The label carries the meaning; a violet
              container around one line of secondary text was the second violet
              on a card that only needed one. */}
          {postType !== "SellOnly" && wantedItemOffer ? (
            <p className="flex items-start gap-1.5 text-meta leading-[1.5] text-ink-muted">
              <ArrowLeftRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span className="line-clamp-2">
                <span className="font-medium text-ink-secondary">{t("card.wants")}</span>{" "}
                {wantedItemOffer}
              </span>
            </p>
          ) : null}

          <div className="flex items-baseline justify-between gap-2 pt-1">
            {showsPrice ? (
              <span
                data-numeric
                className="text-[1.25rem] leading-[1.3] font-bold text-ink"
              >
                ฿{price.toLocaleString("en-GB")}
              </span>
            ) : (
              <span className="text-body font-semibold text-ink">{t("card.tradeOnly")}</span>
            )}
            {/* Stated in words. The edge carries the colour, but condition can
                never be colour alone (CLAUDE.md §6). */}
            <span className="shrink-0 text-meta font-medium text-ink-muted">
              {st.of(rarity).label}
            </span>
          </div>

          <TrustBadge
            name={seller.name}
            isVerified={seller.isVerified}
            faculty={seller.faculty}
            size="sm"
          />
        </div>
      </Link>
    </Surface>
  );
}
