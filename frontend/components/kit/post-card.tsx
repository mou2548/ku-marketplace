import Link from "next/link";
import { ArrowLeftRight, BookOpen } from "lucide-react";

import { ITEM_CONDITION, POST_TYPE, type ItemCondition, type PostType } from "@/lib/status";
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
  const rarity = ITEM_CONDITION[condition];
  const showsPrice = postType !== "TradeOnly";

  return (
    <Surface
      as="article"
      shape="card"
      interactive
      // Condition owns the card edge, the way it owns the inventory slot — one
      // colour event per card instead of five. Set as custom properties so the
      // ring is a class reading a variable, never a colour passed to `style`.
      style={
        {
          "--slot-edge": rarity.edge,
          "--slot-glow": rarity.glow,
        } as React.CSSProperties
      }
      className={cn(
        "overflow-hidden [box-shadow:var(--shadow-raised),var(--shadow-rarity)]",
        className,
      )}
    >
      <Link href={`/market/${postId}`} className="block focus:outline-none">
        <div className="relative">
          <PostImage src={imageUrl} alt={name} aspectRatio={aspectRatio} />
          {/* Filled, with white text — `TONE_SOLID`, the same treatment
              `warning` and `danger` chips already use. Used to be a local
              `amber-700`/`green-700` ternary that bypassed the tone system
              entirely and, worse, picked the same hue `warning` chips use for
              a pure trade — see the trade tone comment in globals.css.
              No `shadow-raised`: its inset white top-highlight is meant for a
              flat card surface, and traced around this pill's full rounded
              edge as a visible white rim, worst over a photo. */}
          <span
            className={cn(
              "pointer-events-none absolute top-2 left-2 flex items-center gap-1.5",
              "rounded-pill px-2.5 py-1 text-meta font-semibold",
              TONE_SOLID[POST_TYPE[postType].tone],
            )}
          >
            <StatusIcon name={POST_TYPE[postType].icon} className="size-3.5" />
            {POST_TYPE[postType].label}
          </span>
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
                <span className="font-medium text-ink-secondary">Wants</span>{" "}
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
              <span className="text-body font-semibold text-ink">
                Trade only
              </span>
            )}
            {/* Stated in words. The edge carries the colour, but condition can
                never be colour alone (CLAUDE.md §6). */}
            <span className="shrink-0 text-meta font-medium text-ink-muted">
              {rarity.label}
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
