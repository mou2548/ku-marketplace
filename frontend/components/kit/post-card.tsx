import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeftRight, BookOpen } from "lucide-react";

import { ITEM_CONDITION, type ItemCondition, type PostType } from "@/lib/status";
import { useStatusText } from "@/lib/i18n/status-text";
import { cn } from "@/lib/utils";

import { PostImage } from "./post-image";
import { ListingTypeBadge } from "./listing-type-badge";
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
    <article className={cn("group/pin break-inside-avoid", className)}>
      <Link
        href={`/market/${postId}`}
        className="block rounded-card outline-none"
      >
        <div className="relative overflow-hidden rounded-[1rem] bg-surface-sunken shadow-flat transition-[transform,box-shadow] duration-[--dur-base] ease-[--ease-out] group-hover/pin:-translate-y-0.5 group-hover/pin:shadow-floating group-focus-visible/pin:shadow-floating">
          <PostImage
            src={imageUrl}
            alt={name}
            aspectRatio={aspectRatio}
            className="transition-transform duration-[--dur-slow] ease-[--ease-out] group-hover/pin:scale-[1.025]"
          />
        </div>

        <div className="flex flex-col gap-1.5 px-1 pt-2.5 pb-1">
          <div className="flex items-center justify-between gap-2">
            <ListingTypeBadge type={postType} className="min-w-0 truncate" />
            {showsPrice ? (
              <span
                data-numeric
                className="shrink-0 text-[1rem] leading-[1.4] font-bold text-ink-brand"
              >
                ฿{price.toLocaleString("en-GB")}
              </span>
            ) : null}
          </div>

          <h3 className="line-clamp-2 text-[0.9375rem] leading-[1.45] font-semibold text-ink">
            {name}
          </h3>

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
              <ArrowLeftRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span className="line-clamp-2">
                <span className="font-medium text-ink-secondary">{t("card.wants")}</span>{" "}
                {wantedItemOffer}
              </span>
            </p>
          ) : null}

          <div className="mt-0.5 flex items-center justify-between gap-2">
            <TrustBadge
              name={seller.name}
              isVerified={seller.isVerified}
              faculty={seller.faculty}
              size="sm"
              className="min-w-0"
            />
            <span className="shrink-0 text-meta font-medium text-ink-muted">
              {st.of(rarity).label}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
