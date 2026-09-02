import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Package, ShieldCheck } from "lucide-react";

import { PostCard } from "@/components/kit/post-card";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { getPost, listPosts } from "@/lib/api/posts";
import { getCurrentUserId } from "@/lib/api/session";
import type { Post } from "@/lib/api/types";

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
  const post = await getPost(Number(postId)).catch(() => undefined);
  if (!post) notFound();

  const viewerId = await getCurrentUserId();
  const rarity = ITEM_CONDITION[post.item.condition];
  const isMine = post.seller.user_id === viewerId;
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

  // Two grids under the fold, both derived from the posts list because the API
  // defines no related-posts route (docs/design/api-gaps.md).
  const all = await listPosts();
  const others = all.filter((p) => p.post_id !== post.post_id);
  const fromSeller = others
    .filter((p) => p.seller.user_id === post.seller.user_id)
    .slice(0, 4);
  const similar = others
    .filter(
      (p) =>
        p.item.category === post.item.category &&
        p.seller.user_id !== post.seller.user_id,
    )
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-10">
      <Link
        href="/"
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to market
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* The image is bounded, the page is not. Capping the whole page just
          moves the empty half from the middle to the right; capping the photo
          is what stops it inflating into a 670px slab that sets the page
          height. Everything else takes the width it is given. */}
      <div className="lg:w-[24rem] lg:shrink-0 xl:w-[28rem]">
        <Surface
          shape="card"
          // Portrait is a phone shape. On a wide screen the same 4:5 made the
          // photo the tallest thing on the page by a wide margin.
          className="relative aspect-[4/5] w-full overflow-hidden lg:aspect-[4/3]"
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
            style={{ "--slot-edge": rarity.edge } as React.CSSProperties}
            className="absolute inset-0 rounded-card ring-2 ring-[var(--slot-edge)] ring-inset"
          />
        </Surface>
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={POST_TYPE[post.post_type]} size="sm" />
            <span
              style={
                {
                  "--slot-edge": rarity.fg,
                  "--slot-glow": rarity.glow,
                } as React.CSSProperties
              }
              className="rounded-pill bg-[var(--slot-glow)] px-2.5 py-1 text-[0.75rem] font-medium text-[var(--slot-edge)]"
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
          <p className="max-w-prose text-[0.9375rem] leading-[1.75] whitespace-pre-line text-ink-secondary">
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

        {/* The specs were a bare text grid floating on the page; at any width
            over about 900px they read as a table dump rather than a spec. */}
        <Surface as="section" shape="panel" fill="plate" noise className="p-4">
          <h2 className="mb-3 text-overline text-ink-muted uppercase">Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-3 2xl:grid-cols-4">
            {specs.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-[0.75rem] text-ink-muted">{label}</dt>
                <dd className="text-[0.9375rem] font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Surface>

        <PostActions post={post} isMine={isMine} />
      </div>
      </div>

      {fromSeller.length > 0 ? (
        <RelatedPosts
          title={`More from ${post.seller.name}`}
          posts={fromSeller}
        />
      ) : null}

      {similar.length > 0 ? (
        <RelatedPosts title={`Other ${post.item.category}`} posts={similar} />
      ) : null}
    </div>
  );
}

/** A row of other listings, so the page has a bottom instead of a dead field. */
function RelatedPosts({ title, posts }: { title: string; posts: Post[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h2">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
        {posts.map((p) => (
          <li key={p.post_id}>
            <PostCard
              postId={p.post_id}
              name={p.item.name}
              price={p.price}
              postType={p.post_type}
              condition={p.item.condition}
              imageUrl={p.item.images.find((i) => i.is_primary)?.image_url}
              courseName={p.item.course_name}
              seller={p.seller}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
