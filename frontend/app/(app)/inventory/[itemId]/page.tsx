import { formatDate } from "@/lib/date-format";
import { getCopy } from "@/lib/copy";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, CalendarDays, Clock, Eye, Gift, Pencil, Plus, ShoppingBag, Store, Tag, XCircle } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { ConfirmButton } from "@/components/kit/confirm-button";
import { ListingTypeBadge } from "@/components/kit/listing-type-badge";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TONE_CHIP } from "@/components/kit/tone";
import { ProductGallery } from "@/components/market/product-gallery";
import { unlistListing } from "@/lib/actions/posts";
import { getItem, getItemHistorySummary, getMyItems } from "@/lib/api/items";
import { listPosts } from "@/lib/api/posts";
import { getAccessToken } from "@/lib/api/session";
import type { Item } from "@/lib/api/types";
import { freeUnits, isHandedOver } from "@/lib/item-availability";
import { ITEM_CONDITION, ITEM_TRANSFERRED_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Owner-facing counterpart of the market detail: photo, facts, then action. */
export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const tStatus = await getCopy("status");
  const t = await getCopy();
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

  // An item can now carry more than one live post at once (e.g. a SellOnly
  // post and a TradeOnly post together) — every open channel gets its own
  // row in the action panel below, keyed by its own post_id.
  //
  // The channel list comes from the history summary, not `listPosts()`: the
  // public feed (and `GET /posts/:id`) both filter to `quantityRemaining >
  // 0`, so a sold-out-but-still-open post would silently vanish from the
  // action panel instead of showing "0 left" if `listPosts()` were the only
  // source. `listPosts()` is only used here to enrich a channel with its
  // price when it happens to still be publicly visible.
  const allPosts = await listPosts();
  const postById = new Map(allPosts.map((p) => [p.post_id, p]));
  const channels = (summary?.channels ?? [])
    .filter((channel) => channel.type === "post")
    .map((channel) => ({
      post_id: channel.post_id,
      post_type: channel.post_type,
      quantity_remaining: channel.quantity_remaining,
      // Sold out (quantityRemaining 0) is filtered out of the public feed,
      // so such a channel has no price to show and no public page to view.
      isPubliclyVisible: postById.has(channel.post_id),
      price: postById.get(channel.post_id)?.price ?? null,
    }));
  // A giveaway is also a channel — it used to be silently dropped here, so
  // an item entirely given away read as "Not listed" with no way back to it.
  const giveawayChannels = (summary?.channels ?? []).filter(
    (channel) => channel.type === "giveaway",
  );
  const hasOpenChannel = channels.length > 0 || giveawayChannels.length > 0;
  // How much of what's Listed can still actually be bought/claimed right
  // now — Listed itself never moves on a sale, so this is the number that
  // answers "is there anything left on my listing" at a glance, without
  // requiring a click into each channel's own "N left".
  const stillAvailable =
    channels.reduce((total, channel) => total + channel.quantity_remaining, 0) +
    giveawayChannels.reduce(
      (total, channel) => total + (channel.quantity_total - channel.quantity_claimed),
      0,
    );
  // `item_status` Transferred counts too (D3): a traded-away item's summary
  // still reports every unit as available.
  const isTransferred = isHandedOver(item, summary);
  const available = freeUnits(item, summary);
  const rarity = ITEM_CONDITION[item.condition];

  const restSummaries = Object.fromEntries(
    await Promise.all(
      items
        .filter((candidate) => candidate.item_id !== item.item_id)
        .map(async (candidate) => [
          candidate.item_id,
          await getItemHistorySummary(candidate.item_id).catch(() => undefined),
        ] as const),
    ),
  );
  const rest = items.filter((candidate) => {
    if (candidate.item_id === item.item_id) return false;
    const candidateSummary = restSummaries[candidate.item_id];
    return !isHandedOver(candidate, candidateSummary);
  });

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
      formatDate(new Date(item.warranty_expiry)),
    ]);
  }

  const actionPanel = (
    <Surface shape="panel" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line p-5">
        <span className="flex items-center gap-2 text-body-sm font-semibold">
          <Store aria-hidden className="size-4 text-ink-brand" />
          {isTransferred
            ? "Handed over"
            : hasOpenChannel
              ? t("inventory.onTheMarket")
              : t("inventory.notListed")}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-5">
        {isTransferred ? (
          <p className="text-body-sm text-ink-secondary">
            This item has left your active inventory. Its listing and completed
            outcome remain visible below as history.
          </p>
        ) : (
          <>
            {!hasOpenChannel ? (
              <p className="text-body-sm text-ink-secondary">
                {t("inventory.privateItemHint")}
              </p>
            ) : null}

            {giveawayChannels.map((channel) => (
              <Surface
                key={`giveaway-${channel.giveaway_id}`}
                shape="card"
                elevation="flat"
                className="flex flex-col gap-2 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1 rounded-chip border px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold",
                      TONE_CHIP.trade,
                    )}
                  >
                    <Gift aria-hidden className="size-3" />
                    Giveaway
                  </span>
                  <span data-numeric className="text-meta text-ink-muted">
                    {channel.quantity_total - channel.quantity_claimed} left
                  </span>
                </div>
                <LinkButton
                  size="sm"
                  block
                  href={`/giveaway/${channel.giveaway_id}`}
                >
                  <Gift className="size-4 shrink-0" />
                  View giveaway
                </LinkButton>
              </Surface>
            ))}

            {channels.map((channel) => (
              <Surface
                key={channel.post_id}
                shape="card"
                elevation="flat"
                className="flex flex-col gap-2 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <ListingTypeBadge type={channel.post_type} />
                  <span data-numeric className="text-meta text-ink-muted">
                    {channel.quantity_remaining} left
                  </span>
                </div>
                {channel.post_type !== "TradeOnly" && channel.price !== null ? (
                  <p data-numeric className="text-h3 font-bold text-ink-brand">
                    ฿{channel.price.toLocaleString("en-GB")}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <LinkButton
                    size="sm"
                    block
                    className="min-w-0 flex-1"
                    href={`/inventory/${item.item_id}/list/${channel.post_id}`}
                  >
                    <Tag className="size-4 shrink-0" />
                    <span className="truncate">{t("inventory.editListing")}</span>
                  </LinkButton>
                  {channel.isPubliclyVisible ? (
                    <LinkButton
                      variant="secondary"
                      size="sm"
                      block
                      className="min-w-0 flex-1"
                      href={`/market/${channel.post_id}`}
                    >
                      <Eye className="size-4 shrink-0" />
                      <span className="truncate">{t("inventory.viewPublic")}</span>
                    </LinkButton>
                  ) : null}
                </div>
                <ConfirmButton
                  title="Unlist this listing?"
                  description="This takes it off the market. The item itself stays in your inventory, and this channel's history is kept."
                  confirmLabel="Unlist"
                  doneMessage="Listing removed from the market."
                  icon={<XCircle className="size-4" />}
                  onConfirm={unlistListing.bind(null, channel.post_id)}
                  trigger={
                    <>
                      <XCircle className="size-4" />
                      Unlist
                    </>
                  }
                  triggerProps={{ variant: "ghost", size: "sm" }}
                />
              </Surface>
            ))}

            {available > 0 ? (
              <LinkButton
                size="lg"
                block
                variant={hasOpenChannel ? "secondary" : "primary"}
                href={`/inventory/${item.item_id}/list`}
              >
                {hasOpenChannel ? (
                  <Plus className="size-4" />
                ) : (
                  <Tag className="size-4" />
                )}
                {hasOpenChannel
                  ? t("inventory.addAnotherListing")
                  : t("inventory.listIt")}
              </LinkButton>
            ) : null}
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
          : available > 0
            ? t("inventory.available", { count: available })
            : t("inventory.noneAvailable")}
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

      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] md:items-start xl:grid-cols-[minmax(0,1.08fr)_minmax(17rem,.78fr)_20rem] xl:gap-8">
        <ProductGallery images={item.images} name={item.name} />

        <div className="flex min-w-0 flex-col gap-6 md:pt-2">
          <header className="flex flex-col gap-3">
            <p className="text-overline font-semibold text-ink-brand uppercase">
              {item.category}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {isTransferred ? (
                <StatusBadge status={ITEM_TRANSFERRED_STATUS} size="sm" />
              ) : null}
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
              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-meta text-ink-muted">Right now</p>
                  <dl className="grid grid-cols-2 gap-2">
                    <ActivityMetric
                      icon={<Store className="size-4" />}
                      label="Listed"
                      value={summary.posted_quantity}
                      sub={[
                        hasOpenChannel
                          ? {
                              icon: <ShoppingBag className="size-3" />,
                              text:
                                stillAvailable > 0
                                  ? `${stillAvailable} still up for grabs`
                                  : "None left to buy or claim",
                            }
                          : null,
                        summary.ongoing_quantity > 0
                          ? {
                              icon: <Clock className="size-3" />,
                              text: `${summary.ongoing_quantity} ongoing`,
                            }
                          : null,
                      ].filter((line) => line !== null)}
                    />
                    <ActivityMetric
                      icon={<Plus className="size-4" />}
                      label="Unlisted"
                      value={available}
                    />
                  </dl>
                </div>

                <div>
                  <p className="mb-2 text-meta text-ink-muted">History</p>
                  <dl className="grid grid-cols-3 gap-2">
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
                    <ActivityMetric
                      icon={<Gift className="size-4" />}
                      label={t("inventory.given")}
                      value={summary.given_quantity}
                    />
                  </dl>
                </div>
              </div>
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
              date: formatDate(new Date(item.created_at)),
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
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  /** Quantities nested *inside* this one (e.g. how much of Listed is still
   * gettable, how much is Ongoing) — shown as smaller lines under the
   * number, never their own same-weight tile, so they can't be misread as
   * sibling amounts to add on top. */
  sub?: Array<{ icon: React.ReactNode; text: string }>;
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
      {sub?.map((line) => (
        <p
          key={line.text}
          className="mt-1 flex items-center gap-1 text-caption text-ink-muted"
        >
          {line.icon}
          {line.text}
        </p>
      ))}
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
