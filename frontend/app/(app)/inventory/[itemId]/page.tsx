import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  ShieldCheck,
  Store,
  Tag,
} from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { getMyItems, getPosts } from "@/lib/api/fixtures";
import { ITEM_CONDITION, ITEM_STATUS, POST_TYPE } from "@/lib/status";

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
  const { itemId } = await params;
  const items = await getMyItems();
  const item = items.find((i) => i.item_id === Number(itemId));
  if (!item) notFound();

  const posts = await getPosts();
  const post = posts.find((p) => p.item_id === item.item_id);
  const rarity = ITEM_CONDITION[item.condition];
  const primary = item.images.find((i) => i.is_primary) ?? item.images[0];

  const specs: Array<[string, string]> = [
    ["Category", item.category],
    ["Condition", rarity.label],
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
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to my stuff
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="lg:w-1/2">
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
                  <Surface shape="slot" elevation="flat" className="overflow-hidden">
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

        <div className="flex flex-col gap-5 lg:w-1/2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ITEM_STATUS[item.status]} size="sm" />
              <span
                className="rounded-pill px-2.5 py-1 text-[0.75rem] font-medium"
                style={{ color: rarity.fg, backgroundColor: rarity.glow }}
              >
                {rarity.label}
              </span>
            </div>

            <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em] sm:text-[1.875rem]">
              {item.name}
            </h1>
          </div>

          {/* The listing terms come first: everything the owner might do next
              depends on whether this is already on the market. */}
          {post ? (
            <Surface shape="card" className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[0.875rem] font-semibold">
                  <Store aria-hidden className="size-4 text-ink-brand" />
                  On the market
                </span>
                <StatusBadge
                  status={POST_TYPE[post.post_type]}
                  variant="solid"
                  size="sm"
                />
              </div>

              {post.post_type !== "TradeOnly" ? (
                <p data-numeric className="text-[1.5rem] leading-[1.2] font-bold">
                  ฿{post.price.toLocaleString("en-GB")}
                </p>
              ) : null}

              {post.wanted_item_offer ? (
                <p className="rounded-control bg-tone-trade-bg p-3 text-[0.8125rem] leading-[1.6] text-tone-trade-fg">
                  Wants in trade: {post.wanted_item_offer}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <LinkButton
                  variant="secondary"
                  size="sm"
                  block
                  href={`/market/${post.post_id}`}
                >
                  View the public listing
                </LinkButton>
                <LinkButton
                  size="sm"
                  block
                  href={`/inventory/${item.item_id}/list`}
                >
                  <Tag className="size-4" />
                  Edit listing
                </LinkButton>
              </div>
            </Surface>
          ) : (
            <Surface
              shape="card"
              elevation="flat"
              className="flex flex-col gap-3 bg-brand-subtle p-4"
            >
              <p className="text-[0.875rem] leading-[1.7] text-ink-secondary">
                This item is not listed. Nobody can see it but you, and it can
                still be put on a trade offer from your inventory.
              </p>
              <LinkButton size="sm" href={`/inventory/${item.item_id}/list`}>
                <Tag className="size-4" />
                List it on the market
              </LinkButton>
            </Surface>
          )}

          {item.description ? (
            <p className="text-[0.9375rem] leading-[1.75] whitespace-pre-line text-ink-secondary">
              {item.description}
            </p>
          ) : null}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {specs.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-[0.75rem] text-ink-muted">{label}</dt>
                <dd className="text-[0.9375rem] font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
            <p className="flex flex-1 items-center gap-2 text-[0.8125rem] text-ink-muted">
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
              <Pencil className="size-4" />
              Edit details
            </LinkButton>
          </div>

          {item.status === "Transferred" ? (
            <p className="flex items-start gap-2 rounded-control bg-tone-success-bg p-3 text-[0.8125rem] leading-[1.6] text-tone-success-fg">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
              This item has been handed over and is kept for your records only.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
