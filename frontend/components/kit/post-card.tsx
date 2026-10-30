import { getCopy } from "@/lib/copy";
import Link from "next/link";
import { ArrowLeftRight, BookOpen } from "lucide-react";

import { type ItemCondition, type PostType } from "@/lib/status";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";

import { PostImage } from "./post-image";
import { ListingTypeBadge } from "./listing-type-badge";
import { ItemConditionBadge } from "./item-condition-badge";
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
  seller: {
    user_id: number;
    name: string;
    isVerified?: boolean;
    faculty?: string | null;
    avatar_url?: string | null;
  };
  className?: string;
  hoverEffects?: boolean;
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
  hoverEffects = true,
}: PostCardProps) {
  const t = getCopy();
  const showsPrice = postType !== "TradeOnly";

  return (
    <article className={cn("break-inside-avoid", className)}>
      <Link
        href={`/market/${postId}`}
        className={cn(
          "block rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand",
          hoverEffects && "group/pin",
        )}
      >
        <div className="relative overflow-hidden rounded-card bg-surface-sunken shadow-flat transition-[transform,box-shadow] duration-[--dur-base] ease-[--ease-out] group-hover/pin:-translate-y-0.5 group-hover/pin:shadow-floating group-focus-visible/pin:shadow-floating">
          <PostImage
            src={imageUrl}
            alt={name}
            aspectRatio={aspectRatio}
            className="transition-transform duration-[--dur-slow] ease-[--ease-out] group-hover/pin:scale-[1.025]"
          />
        </div>

        <div className="flex flex-col gap-1.5 px-1 pt-2.5 pb-1">
          {/* Wraps rather than truncates: at 390px a long price used to cut
              "For sale" down to "For" (audit E02). The badge never shrinks;
              when the two do not fit on one line the price drops below. */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <ListingTypeBadge type={postType} className="shrink-0 whitespace-nowrap" />
            {showsPrice ? (
              <span
                data-numeric
                className="min-w-0 text-[1rem] leading-[1.4] font-bold text-ink-brand"
              >
                {formatPrice(price)}
              </span>
            ) : null}
          </div>

          <h3 className="line-clamp-2 text-[0.9375rem] leading-[1.45] font-semibold text-ink">
            {name}
          </h3>

          <ItemConditionBadge condition={condition} />

          {courseName ? (
            <span className="inline-flex w-fit items-center gap-1 rounded-chip bg-surface-sunken px-2 py-0.5 text-meta font-medium text-ink-secondary">
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
              <ArrowLeftRight
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0"
              />
              <span className="line-clamp-2">
                <span className="font-medium text-ink-secondary">
                  {t("card.wants")}
                </span>{" "}
                {wantedItemOffer}
              </span>
            </p>
          ) : null}
        </div>
      </Link>
      <div className="flex min-h-11 items-center justify-between gap-2 px-1 pb-1">
        <Link
          href={`/sellers/${seller.user_id}`}
          aria-label={t("seller.openProfile", { name: seller.name })}
          className="flex min-h-11 min-w-0 flex-1 items-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <TrustBadge
            name={seller.name}
            avatarUrl={seller.avatar_url}
            isVerified={seller.isVerified}
            faculty={seller.faculty}
            size="sm"
            className="min-w-0"
          />
        </Link>
      </div>
    </article>
  );
}

/** The photo a listing's card shows. The feed reads this one's size. */
export function postCardImageUrl(post: {
  item: { images: Array<{ image_url: string }> };
}): string | undefined {
  return post.item.images[0]?.image_url;
}

/**
 * This card's height in px at a column width, for masonry packing only. It
 * follows the markup above row by row (photo, type and price, title,
 * condition, course, description, "wants", seller), so change it with them.
 * Being a few pixels off only ends a column a little early or late.
 */
export function estimatePostCardHeight(
  card: Pick<
    PostCardProps,
    "name" | "postType" | "imageUrl" | "aspectRatio" | "description" | "courseName" | "wantedItemOffer"
  >,
  columnWidth: number,
): number {
  const textWidth = columnWidth - 8; // px-1
  const lines = (text: string | null | undefined, charWidth: number) =>
    text ? Math.min(2, Math.ceil((text.length * charWidth) / textWidth)) : 0;

  // PostImage: the photo's ratio, or a 16:7 plate when there is no photo.
  const photo = card.imageUrl
    ? columnWidth / (card.aspectRatio ?? 0.8)
    : (columnWidth * 7) / 16;
  const rows = [
    24, // type badge and price
    lines(card.name, 7.5) * 22, // line-clamp-2
    22, // condition
    card.courseName ? 20 : 0,
    lines(card.description, 6.5) * 20, // line-clamp-2
    card.postType !== "SellOnly" ? lines(card.wantedItemOffer, 6) * 18 : 0,
  ].filter((height) => height > 0);
  // pt-2.5 + pb-1, gap-1.5 between rows, then the 44px seller row + pb-1.
  return photo + 14 + rows.reduce((sum, h) => sum + h, 0) + (rows.length - 1) * 6 + 48;
}
