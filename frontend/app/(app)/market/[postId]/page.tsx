import Image from "next/image";
import { notFound } from "next/navigation";
import { BookOpen, Package, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { getPost, VIEWER_ID } from "@/lib/api/fixtures";

import { ITEM_CONDITION, POST_TYPE } from "@/lib/status";

import { PostActions } from "./post-actions";

/**
 * E2 detail / E3 entry. Two columns on desktop, a full-bleed gallery with a
 * sticky action bar on mobile — the action must never be below the fold on a
 * phone, which is where a marketplace loses its conversions.
 *
 * A `Both` post shows *both* affordances side by side rather than hiding the
 * trade behind a menu: research P3 says a trader who cannot see the swap路 will
 * assume the post is sale-only and leave.
 */
export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getPost(Number(postId));
  if (!post) notFound();

  const rarity = ITEM_CONDITION[post.item.condition];
  const isMine = post.seller.user_id === VIEWER_ID;
  const image = post.item.images[0]?.image_url;

  const specs: Array<[string, string]> = [
    ["Category", post.item.category],
    ["Condition", rarity.label],
    ["Remaining", `${post.quantity_remaining} left`],
  ];
  if (post.item.course_name) specs.push(["Course code", post.item.course_name]);
  if (post.item.brand_model) specs.push(["Model", post.item.brand_model]);
  if (post.item.size) specs.push(["Size", post.item.size]);
  // Remaining warranty is a reason to buy and the inventory screen already
  // showed it; the buyer is the one it actually matters to.
  if (post.item.warranty_expiry) {
    specs.push([
      "Warranty until",
      new Date(post.item.warranty_expiry).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    ]);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* Gallery */}
      <div className="lg:w-1/2">
        <Surface
          shape="card"
          className="relative aspect-[4/5] w-full overflow-hidden"
        >
          {image ? (
            <Image
              src={image}
              alt={post.item.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center bg-surface-sunken text-ink-disabled">
              <BookOpen aria-hidden className="size-10" />
            </span>
          )}
          <span
            aria-hidden
            className="absolute inset-0 rounded-card ring-2 ring-inset"
            style={{ boxShadow: `inset 0 0 0 2px ${rarity.edge}` }}
          />
        </Surface>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-5 lg:w-1/2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={POST_TYPE[post.post_type]} variant="solid" size="sm" />
            <span
              className="rounded-pill px-2.5 py-1 text-[0.75rem] font-medium"
              style={{ color: rarity.fg, backgroundColor: `${rarity.glow}` }}
            >
              {rarity.label}
            </span>
          </div>

          <h1 className="text-display">
            {post.item.name}
          </h1>

          {post.post_type !== "TradeOnly" ? (
            <p data-numeric className="text-[1.875rem] leading-[1.2] font-bold">
              ฿{post.price.toLocaleString("en-GB")}
            </p>
          ) : (
            <p className="text-[1.125rem] font-semibold text-tone-trade-fg">
              Trade only
            </p>
          )}
        </div>

        {/* Trust first — money moves off-platform, so identity is the product. */}
        <Surface shape="card" className="flex items-center gap-3 p-4">
          <TrustBadge
            name={post.seller.name}
            isVerified={post.seller.isVerified}
            faculty={post.seller.faculty}
            year={post.seller.year}
          />
          <span className="ml-auto flex items-center gap-1.5 text-[0.75rem] font-medium text-ink-brand">
            <ShieldCheck aria-hidden className="size-4" />
            KU student
          </span>
        </Surface>

        {post.description ? (
          <p className="text-[0.9375rem] leading-[1.75] whitespace-pre-line text-ink-secondary">
            {post.description}
          </p>
        ) : null}

        {post.post_type !== "SellOnly" && post.wanted_item_offer ? (
          <Surface
            shape="card"
            elevation="flat"
            className="flex gap-3 bg-tone-trade-bg border-l-4 border-l-tone-trade-solid p-4"
          >
            <Package aria-hidden className="mt-0.5 size-5 shrink-0 text-tone-trade-fg" />
            <div>
              <p className="text-[0.8125rem] font-semibold text-tone-trade-fg">
                The owner is looking for
              </p>
              <p className="text-[0.9375rem] leading-[1.7] text-ink-secondary">
                {post.wanted_item_offer}
              </p>
            </div>
          </Surface>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {specs.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-[0.75rem] text-ink-muted">{label}</dt>
              <dd className="text-[0.9375rem] font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <PostActions post={post} isMine={isMine} />
      </div>
    </div>
  );
}
