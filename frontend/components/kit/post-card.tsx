import Link from "next/link";

import { ITEM_CONDITION, POST_TYPE, type ItemCondition, type PostType } from "@/lib/status";
import { cn } from "@/lib/utils";

import { PostImage } from "./post-image";
import { StatusBadge } from "./status-badge";
import { Surface } from "./surface";
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
      className={cn("overflow-hidden", className)}
    >
      <Link href={`/market/${postId}`} className="block focus:outline-none">
        <div className="relative">
          <PostImage src={imageUrl} alt={name} aspectRatio={aspectRatio} />
          <span className="pointer-events-none absolute top-2 left-2">
            <StatusBadge status={POST_TYPE[postType]} variant="solid" size="sm" />
          </span>
        </div>

        <div className="flex flex-col gap-2 p-3">
          <h3 className="line-clamp-2 text-[0.9375rem] leading-[1.5] font-semibold">
            {name}
          </h3>

          {courseName ? (
            <span className="w-fit rounded-chip bg-brand-subtle px-1.5 py-0.5 text-[0.75rem] font-medium text-ink-brand">
              {courseName}
            </span>
          ) : null}

          {description ? (
            <p className="line-clamp-3 text-[0.8125rem] leading-[1.6] text-ink-muted">
              {description}
            </p>
          ) : null}

          {postType !== "SellOnly" && wantedItemOffer ? (
            <p className="line-clamp-2 rounded-chip bg-tone-trade-bg px-2 py-1 text-[0.75rem] leading-[1.5] text-tone-trade-fg">
              Wants in trade: {wantedItemOffer}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            {showsPrice ? (
              <span
                data-numeric
                className="text-[1.0625rem] leading-[1.4] font-semibold text-ink"
              >
                ฿{price.toLocaleString("en-GB")}
              </span>
            ) : (
              <span className="text-[0.8125rem] font-medium text-tone-trade-fg">
                Trade only
              </span>
            )}
            <span
              className="text-[0.75rem] font-medium"
              style={{ color: rarity.fg }}
            >
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
