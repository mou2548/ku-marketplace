import { formatDate } from "@/lib/date-format";
import { getCopy } from "@/lib/copy";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Box, Package, ShieldCheck, Sparkles } from "lucide-react";

import { PostCard } from "@/components/kit/post-card";
import { ListingTypeBadge } from "@/components/kit/listing-type-badge";
import { Surface } from "@/components/kit/surface";
import { ProductGallery } from "@/components/market/product-gallery";
import { Notice } from "@/components/patterns/notice";
import { TrustBadge } from "@/components/kit/trust-badge";
import { getSellerPosts } from "@/lib/api/sellers";
import { getPost, listPosts } from "@/lib/api/posts";
import { getCurrentUserId } from "@/lib/api/session";
import type { Post } from "@/lib/api/types";
import { ITEM_CONDITION } from "@/lib/status";

import { PostActions } from "./post-actions";

/**
 * Product-led detail page. The composition follows the approved commerce
 * reference (gallery / information / deal card) while keeping every fact
 * truthful: no invented ratings, delivery promises, or platform escrow.
 */
export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const tStatus = await getCopy("status");
  const t = await getCopy();
  const { postId } = await params;
  const post = await getPost(Number(postId)).catch(() => undefined);
  if (!post) notFound();

  const viewerId = await getCurrentUserId();
  const rarity = ITEM_CONDITION[post.item.condition];
  const isMine = post.seller.user_id === viewerId;

  const specs: Array<[string, string]> = [
    [t("inventory.category"), post.item.category],
    [t("inventory.condition"), tStatus(rarity.labelKey)],
    [t("market.available"), String(post.quantity_remaining)],
  ];
  if (post.item.course_name) {
    specs.push([t("market.courseCode"), post.item.course_name]);
  }
  if (post.item.brand_model) {
    specs.push([t("market.model"), post.item.brand_model]);
  }
  if (post.item.size) specs.push([t("market.size"), post.item.size]);
  if (post.item.warranty_expiry) {
    specs.push([
      t("market.warrantyUntil"),
      formatDate(new Date(post.item.warranty_expiry)),
    ]);
  }

  const [all, sellerListings] = await Promise.all([listPosts(), getSellerPosts(post.seller.user_id, new URLSearchParams({ limit: "5" }))]);
  const others = all.filter((candidate) => candidate.post_id !== post.post_id);
  const fromSeller = sellerListings.data
    .filter((candidate) => candidate.post_id !== post.post_id)
    .slice(0, 4);
  const similar = others
    .filter(
      (candidate) =>
        candidate.item.category === post.item.category &&
        candidate.seller.user_id !== post.seller.user_id,
    )
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-8 pb-6 lg:gap-12">
      <Link
        href="/feed"
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-secondary hover:text-ink-brand"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("market.backToMarket")}
      </Link>

      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] md:items-start xl:grid-cols-[minmax(0,1.08fr)_minmax(17rem,.78fr)_20rem] xl:gap-8">
        <ProductGallery images={post.item.images} name={post.item.name} />

        <div className="flex min-w-0 flex-col gap-6 md:pt-2">
          <header className="flex flex-col gap-3">
            <p className="text-overline font-semibold text-ink-brand uppercase">
              {post.item.category}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ListingTypeBadge type={post.post_type} />
              <span
                style={
                  {
                    "--slot-edge": rarity.fg,
                    "--slot-glow": rarity.glow,
                  } as React.CSSProperties
                }
                className="rounded-pill bg-[var(--slot-glow)] px-2.5 py-1 text-meta font-medium text-[var(--slot-edge)]"
              >
                {tStatus(rarity.labelKey)}
              </span>
            </div>
            <h1 className="text-display text-balance">{post.item.name}</h1>

            <div className="xl:hidden">
              <ProductPrice post={post} tradeOnlyLabel={t("card.tradeOnly")} />
            </div>

            <div className="mt-1 xl:hidden">
              <PostActions post={post} isMine={isMine} />
            </div>
          </header>

          {post.description ? (
            <div>
              <h2 className="mb-2 text-h3">{t("market.aboutItem")}</h2>
              <p className="max-w-prose text-body whitespace-pre-line text-ink-secondary">
                {post.description}
              </p>
            </div>
          ) : null}

          {post.post_type !== "SellOnly" && post.wanted_item_offer ? (
            <Notice tone="trade" className="flex gap-3">
              <Package
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-tone-trade-fg"
              />
              <div>
                <p className="text-caption font-semibold text-tone-trade-fg">
                  {t("market.ownerLooking")}
                </p>
                <p className="text-body text-ink-secondary">
                  {post.wanted_item_offer}
                </p>
              </div>
            </Notice>
          ) : null}

          <section>
            <h2 className="mb-3 text-h3">{t("market.productInfo")}</h2>
            <dl className="divide-y divide-line rounded-card bg-surface px-4 shadow-raised">
              {specs.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(7rem,.8fr)_minmax(0,1fr)] gap-4 py-3"
                >
                  <dt className="text-body-sm text-ink-muted">{label}</dt>
                  <dd className="text-body-sm font-medium text-ink-primary">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="min-w-0 md:col-span-2 xl:col-span-1 xl:sticky xl:top-24">
          <Surface shape="panel" className="overflow-hidden">
            <div className="hidden border-b border-line p-5 xl:block">
              <ProductPrice post={post} tradeOnlyLabel={t("card.tradeOnly")} />
            </div>

            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-body-sm text-ink-secondary">
                  <Box aria-hidden className="size-4 text-ink-brand" />
                  {t("market.available")}
                </span>
                <span data-numeric className="text-body-sm font-semibold">
                  {post.quantity_remaining}
                </span>
              </div>

              <div className="h-px bg-line" />

              <div>
                <p className="mb-3 text-overline text-ink-muted uppercase">
                  {t("market.seller")}
                </p>
                <Link href={`/sellers/${post.seller.user_id}`} className="block min-h-11 rounded-control">
                <TrustBadge
                  name={post.seller.name}
                  isVerified={post.seller.isVerified}
                  faculty={post.seller.faculty}
                  year={post.seller.year}
                />
                </Link>
                {post.seller.isVerified ? <p className="mt-3 flex items-center gap-1.5 text-meta font-medium text-ink-brand">
                  <ShieldCheck aria-hidden className="size-4" />
                  {t("seller.verified")}
                </p> : null}
              </div>

              <div className="hidden xl:block">
                <PostActions post={post} isMine={isMine} />
              </div>
            </div>

            <div className="flex items-start gap-2 bg-brand-subtle px-5 py-3 text-meta text-ink-brand">
              <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{t("market.safeDealHint")}</span>
            </div>
          </Surface>
        </aside>
      </section>

      {fromSeller.length > 0 ? (
        <RelatedPosts
          title={t("market.moreFromSeller", { seller: post.seller.name })}
          posts={fromSeller}
          href={`/sellers/${post.seller.user_id}`}
          linkLabel={t("seller.viewAll")}
        />
      ) : null}

      {similar.length > 0 ? (
        <RelatedPosts
          title={t("market.similarListings", { category: post.item.category })}
          posts={similar}
        />
      ) : null}
    </div>
  );
}

function ProductPrice({
  post,
  tradeOnlyLabel,
}: {
  post: Post;
  tradeOnlyLabel: string;
}) {
  return post.post_type !== "TradeOnly" ? (
    <p data-numeric className="text-[2rem] leading-tight font-bold text-ink-brand">
      ฿{post.price.toLocaleString("en-GB")}
    </p>
  ) : (
    <p className="text-h2 text-tone-trade-fg">{tradeOnlyLabel}</p>
  );
}

function RelatedPosts({ title, posts, href, linkLabel }: { title: string; posts: Post[]; href?: string; linkLabel?: string }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-h2">{title}</h2>{href ? <Link href={href} className="inline-flex min-h-11 items-center text-ink-brand">{linkLabel}</Link> : null}</div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {posts.map((post) => (
          <li key={post.post_id}>
            <PostCard
              postId={post.post_id}
              name={post.item.name}
              price={post.price}
              postType={post.post_type}
              condition={post.item.condition}
              imageUrl={
                post.item.images.find((image) => image.is_primary)?.image_url
              }
              courseName={post.item.course_name}
              seller={post.seller}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
