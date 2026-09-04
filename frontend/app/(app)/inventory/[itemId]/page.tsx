import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  ShieldCheck,
  Store,
  Tag,
} from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { ListingTypeBadge } from "@/components/kit/listing-type-badge";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { Notice } from "@/components/patterns/notice";
import { getItem, getMyItems } from "@/lib/api/items";
import { listPosts } from "@/lib/api/posts";
import { getAccessToken } from "@/lib/api/session";
import { ITEM_CONDITION, ITEM_STATUS } from "@/lib/status";

/**
 * An item in full.
 *
 * Added 2026-08-07: the inventory grid had no detail view at all, so the only
 * way to read a description or check a warranty date was to open the edit form
 * — which is a different intent and a worse place to just look.
 *
 * The screen answers one question first: is this on the market, and under what
 * terms? Everything an owner does next depends on that answer.
 */
export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const tStatus = await getTranslations("status");
  const t = await getTranslations();
  if (!(await getAccessToken())) {
    redirect("/login");
  }

  const { itemId } = await params;

  // `GET /items/:id` is public and returns any item, not just the viewer's —
  // this screen is "my stuff", so an item that exists but belongs to someone
  // else reads as not found rather than leaking their inventory.
  const [item, items] = await Promise.all([
    getItem(Number(itemId)).catch(() => undefined),
    getMyItems(),
  ]);
  if (!item || !items.some((i) => i.item_id === item.item_id)) notFound();

  const posts = await listPosts();
  const post = posts.find((p) => p.item_id === item.item_id);
  const rarity = ITEM_CONDITION[item.condition];
  const primary = item.images.find((i) => i.is_primary) ?? item.images[0];

  // Everything else in the stash, so the page ends in somewhere to go rather
  // than in a dead half-window. Transferred items are not in the stash.
  const rest = items.filter(
    (i) => i.item_id !== item.item_id && i.status !== "Transferred",
  );

  const specs: Array<[string, string]> = [
    ["Category", item.category],
    ["Condition", tStatus(rarity.labelKey)],
    ["Quantity", String(item.quantity)],
  ];
  if (item.course_name) specs.push(["Course code", item.course_name]);
  if (item.brand_model) specs.push(["Brand and model", item.brand_model]);
  if (item.size) specs.push(["Size", item.size]);
  if (item.warranty_expiry) {
    specs.push([
      "Warranty until",
      new Date(item.warranty_expiry).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    ]);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/inventory"
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />{t("inventory.backToStuff")}</Link>

      {/* The photo is bounded, the page is not — capping the page only moves
          the empty half to the right. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="lg:w-[24rem] lg:shrink-0 xl:w-[28rem]">
          <Surface shape="card" className="overflow-hidden">
            <PostImage
              src={primary?.image_url}
              alt={item.name}
              aspectRatio={4 / 3}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </Surface>

          {item.images.length > 1 ? (
            <ul className="mt-3 grid grid-cols-4 gap-2">
              {item.images.map((img) => (
                <li key={img.image_id}>
                  <Surface shape="slot" elevation="sunken" fill="sunken" className="overflow-hidden">
                    <PostImage
                      src={img.image_url}
                      alt=""
                      aspectRatio={1}
                      sizes="120px"
                    />
                  </Surface>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3">
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

            <h1 className="text-display">
              {item.name}
            </h1>
          </div>

          {/* The listing terms come first: everything the owner might do next
              depends on whether this is already on the market. */}
          {post ? (
            <Surface shape="card" className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-body-sm font-semibold">
                  <Store aria-hidden className="size-4 text-ink-brand" />{t("inventory.onTheMarket")}</span>
                <ListingTypeBadge type={post.post_type} />
              </div>

              {post.post_type !== "TradeOnly" ? (
                <p data-numeric className="text-[1.5rem] leading-[1.2] font-bold text-ink-brand">
                  ฿{post.price.toLocaleString("en-GB")}
                </p>
              ) : null}

              {/* Two equal-weight buttons made the screen ask which one
                  mattered. register.md §4 allows two actions on a card, not
                  two of the same weight: editing is the action, viewing the
                  public page is a reference. */}
              <div className="flex flex-col gap-2">
                <LinkButton
                  size="md"
                  block
                  href={`/inventory/${item.item_id}/list`}
                >
                  <Tag className="size-4" />{t("inventory.editListing")}</LinkButton>
                <LinkButton
                  variant="ghost"
                  size="md"
                  block
                  href={`/market/${post.post_id}`}
                >{t("inventory.viewPublic")}</LinkButton>
              </div>
            </Surface>
          ) : (
            <Notice tone="brand" className="flex flex-col gap-3">
              <p className="text-body-sm text-ink-secondary">
                This item is not listed. Nobody can see it but you, and it can
                still be put on a trade offer from your inventory.
              </p>
              {/* register.md §5: the primary action is at least a fifth of
                  the item image's height, and never under 44px. The photo is
                  4:3 at full width, so 246px at 360px — this was a 36px
                  shrink-to-content button, which is the owner's "the item is
                  large and the button is small" in one place. */}
              <LinkButton size="lg" block href={`/inventory/${item.item_id}/list`}>
                <Tag className="size-4" />{t("inventory.listIt")}</LinkButton>
            </Notice>
          )}

          {item.description ? (
            <p className="text-body whitespace-pre-line text-ink-secondary">
              {item.description}
            </p>
          ) : null}

          <Surface as="section" shape="panel" fill="plate" noise className="p-4">
            <h2 className="mb-3 text-overline text-ink-muted uppercase">{t("inventory.details")}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-3 2xl:grid-cols-4">
              {specs.map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <dt className="text-meta text-ink-muted">{label}</dt>
                  <dd className="text-body font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Surface>

          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
            <p className="flex flex-1 items-center gap-2 text-caption text-ink-muted">
              <CalendarDays aria-hidden className="size-4" />
              Added{" "}
              {new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            <LinkButton
              variant="secondary"
              size="sm"
              href={`/inventory/${item.item_id}/edit`}
            >
              <Pencil className="size-4" />{t("inventory.editDetails")}</LinkButton>
          </div>

          {item.status === "Transferred" ? (
            <p className="flex items-start gap-2 rounded-control bg-tone-success-bg p-3 text-caption leading-[1.6] text-tone-success-fg">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />{t("inventory.handedOver")}</p>
          ) : null}
        </div>
      </div>

      {rest.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-h2">{t("inventory.theRest")}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {rest.map((other) => {
              const cond = ITEM_CONDITION[other.condition];
              return (
                <li key={other.item_id}>
                  <Link href={`/inventory/${other.item_id}`} className="group block">
                    <Surface
                      shape="slot"
                      elevation="sunken"
                      fill="sunken"
                      className="overflow-hidden"
                      style={{ "--slot-edge": cond.edge } as React.CSSProperties}
                    >
                      <PostImage
                        src={
                          other.images.find((i) => i.is_primary)?.image_url
                        }
                        alt=""
                        aspectRatio={1}
                        sizes="160px"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-slot ring-1 ring-[var(--slot-edge)] ring-inset"
                      />
                    </Surface>
                    <span className="mt-1.5 line-clamp-2 block text-meta leading-[1.4] text-ink-secondary group-hover:text-ink">
                      {other.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
