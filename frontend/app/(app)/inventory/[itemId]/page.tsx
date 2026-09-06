import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, CalendarDays, Eye, Pencil, Store, Tag } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { ListingTypeBadge } from "@/components/kit/listing-type-badge";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { ProductGallery } from "@/components/market/product-gallery";
import { getItem, getItemHistorySummary, getMyItems } from "@/lib/api/items";
import { listPosts } from "@/lib/api/posts";
import { getAccessToken } from "@/lib/api/session";
import type { Item } from "@/lib/api/types";
import { ITEM_CONDITION, ITEM_STATUS } from "@/lib/status";

/** Owner-facing counterpart of the market detail: photo, facts, then action. */
export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const tStatus = await getTranslations("status");
  const t = await getTranslations();
  if (!(await getAccessToken())) redirect("/login");

  const { itemId } = await params;
  const [item, items, summary] = await Promise.all([
    getItem(Number(itemId)).catch(() => undefined),
    getMyItems(),
    getItemHistorySummary(Number(itemId)).catch(() => undefined),
  ]);
  if (!item || !items.some((candidate) => candidate.item_id === item.item_id)) {
    notFound();
  }

  const posts = await listPosts();
  const post = posts.find((candidate) => candidate.item_id === item.item_id);
  const isTransferred = item.status === "Transferred";
  const rarity = ITEM_CONDITION[item.condition];
  const rest = items.filter(
    (candidate) =>
      candidate.item_id !== item.item_id && candidate.status !== "Transferred",
  );

  const specs: Array<[string, string]> = [
    [t("inventory.category"), item.category],
    [t("inventory.condition"), tStatus(rarity.labelKey)],
    [t("inventory.quantity"), String(item.quantity)],
  ];
  if (item.course_name) specs.push([t("inventory.courseCode"), item.course_name]);
  if (item.brand_model) specs.push([t("inventory.brandModel"), item.brand_model]);
  if (item.size) specs.push([t("inventory.size"), item.size]);
  if (item.warranty_expiry) {
    specs.push([
      t("inventory.warranty"),
      new Date(item.warranty_expiry).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    ]);
  }

  const actionPanel = (
    <Surface shape="panel" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line p-5">
        <span className="flex items-center gap-2 text-body-sm font-semibold">
          <Store aria-hidden className="size-4 text-ink-brand" />
          {isTransferred
            ? "Transferred"
            : post
              ? t("inventory.onTheMarket")
              : t("inventory.notListed")}
        </span>
        {post && !isTransferred ? (
          <ListingTypeBadge type={post.post_type} />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 p-5">
        {!isTransferred && post?.post_type !== "TradeOnly" && post ? (
          <p
            data-numeric
            className="text-[2rem] leading-tight font-bold text-ink-brand"
          >
            ฿{post.price.toLocaleString("en-GB")}
          </p>
        ) : null}

        {isTransferred ? (
          <p className="text-body-sm text-ink-secondary">
            This item has left your active inventory. Its listing and completed
            outcome remain visible below as history.
          </p>
        ) : post ? (
          <>
            <LinkButton
              size="lg"
              block
              href={`/inventory/${item.item_id}/list`}
            >
              <Tag className="size-4" />
              {t("inventory.editListing")}
            </LinkButton>
            <LinkButton
              variant="secondary"
              block
              href={`/market/${post.post_id}`}
            >
              <Eye className="size-4" />
              {t("inventory.viewPublic")}
            </LinkButton>
          </>
        ) : (
          <>
            <p className="text-body-sm text-ink-secondary">
              {t("inventory.privateItemHint")}
            </p>
            <LinkButton
              size="lg"
              block
              href={`/inventory/${item.item_id}/list`}
            >
              <Tag className="size-4" />
              {t("inventory.listIt")}
            </LinkButton>
          </>
        )}

        {!isTransferred ? (
          <LinkButton
            variant="ghost"
            block
            href={`/inventory/${item.item_id}/edit`}
          >
            <Pencil className="size-4" />
            {t("inventory.editDetails")}
          </LinkButton>
        ) : null}
      </div>

      <div className="bg-brand-subtle px-5 py-3 text-meta text-ink-brand">
        {isTransferred
          ? "Read-only history"
          : post
            ? t("inventory.listedHint")
            : t("inventory.unlistedHint")}
      </div>
    </Surface>
  );

  return (
    <div className="flex flex-col gap-8 pb-6 lg:gap-12">
      <Link
        href="/inventory"
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-secondary hover:text-ink-brand"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("inventory.backToStuff")}
      </Link>

      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:items-start xl:grid-cols-[minmax(0,1.08fr)_minmax(17rem,.78fr)_20rem] xl:gap-8">
        <ProductGallery images={item.images} name={item.name} />

        <div className="flex min-w-0 flex-col gap-6 lg:pt-2">
          <header className="flex flex-col gap-3">
            <p className="text-overline font-semibold text-ink-brand uppercase">
              {item.category}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ITEM_STATUS[item.status]} size="sm" />
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
            <h1 className="text-display text-balance">{item.name}</h1>
          </header>

          <div className="xl:hidden">{actionPanel}</div>

          {item.description ? (
            <div>
              <h2 className="mb-2 text-h3">{t("market.aboutItem")}</h2>
              <p className="max-w-prose text-body whitespace-pre-line text-ink-secondary">
                {item.description}
              </p>
            </div>
          ) : null}

          <section>
            <h2 className="mb-3 text-h3">Item activity</h2>
            {summary ? (
              <dl className="grid grid-cols-3 gap-2">
                <ActivityMetric
                  icon={<Store className="size-4" />}
                  label="Posted"
                  value={summary.posted_quantity}
                />
                <ActivityMetric
                  icon={<Tag className="size-4" />}
                  label="Sold"
                  value={summary.sold_quantity}
                />
                <ActivityMetric
                  icon={<ArrowLeftRight className="size-4" />}
                  label="Traded"
                  value={summary.traded_quantity}
                />
              </dl>
            ) : (
              <Surface shape="card" elevation="flat" className="p-4 text-body-sm text-ink-muted">
                Item history is temporarily unavailable.
              </Surface>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-h3">{t("market.productInfo")}</h2>
            <dl className="divide-y divide-line rounded-card bg-surface px-4 shadow-raised">
              {specs.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(7rem,.8fr)_minmax(0,1fr)] gap-4 py-3"
                >
                  <dt className="text-body-sm text-ink-muted">{label}</dt>
                  <dd className="text-body-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="flex items-center gap-2 text-caption text-ink-muted">
            <CalendarDays aria-hidden className="size-4" />
            {t("inventory.addedOn", {
              date: new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })}
          </p>
        </div>

        <aside className="hidden min-w-0 xl:sticky xl:top-24 xl:block">
          {actionPanel}
        </aside>
      </section>

      {rest.length > 0 ? <OtherItems items={rest} title={t("inventory.theRest")} /> : null}
    </div>
  );
}

function ActivityMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-card bg-surface p-3 shadow-raised">
      <dt className="flex items-center gap-1.5 text-meta text-ink-muted">
        {icon}
        {label}
      </dt>
      <dd data-numeric className="mt-1 text-h2 text-ink-brand">
        {value}
      </dd>
    </div>
  );
}

function OtherItems({ items, title }: { items: Item[]; title: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h2">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => {
          const rarity = ITEM_CONDITION[item.condition];
          return (
            <li key={item.item_id}>
              <Link href={`/inventory/${item.item_id}`} className="group block">
                <Surface shape="card" interactive className="overflow-hidden">
                  <div className="relative aspect-square bg-surface-sunken">
                    <PostImage
                      src={item.images.find((image) => image.is_primary)?.image_url}
                      alt={item.name}
                      aspectRatio={1}
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="h-full"
                    />
                    <span
                      aria-hidden
                      style={{ "--slot-edge": rarity.edge } as React.CSSProperties}
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[var(--slot-edge)]"
                    />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-body-sm font-semibold group-hover:text-ink-brand">
                      {item.name}
                    </p>
                    <p className="mt-1 text-meta text-ink-muted">{item.category}</p>
                  </div>
                </Surface>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
