"use client";

import { getCopy } from "@/lib/copy";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GridListItem, type Selection } from "react-aria-components";
import { ArrowLeftRight, Check, CheckSquare, Gift, Package, Plus, Store, Tag, X } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { InventoryGrid } from "@/components/kit/inventory-slot";
import type { InventoryItem } from "@/components/kit/inventory-slot";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useStatusText } from "@/lib/status-text";
import type { Item, ItemHistorySummary } from "@/lib/api/types";
import {
  ITEM_CONDITION,
  ITEM_TRANSFERRED_STATUS,
  isItemTransferred,
} from "@/lib/status";
import { ChannelChips } from "@/components/kit/channel-chips";

/**
 * A product catalogue for things the student owns. Inventory behaviour stays
 * familiar — tap to open, enter a separate bulk-select mode — but the visual
 * language now matches the market: real photo first, readable status, then
 * product facts. The condition strip is the restrained piece of GAME DNA.
 */
export function InventoryScreen({
  items,
  summaries,
}: {
  items: Item[];
  summaries: Record<number, ItemHistorySummary | undefined>;
}) {
  const t = getCopy();
  const statusText = useStatusText();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Selection>(new Set());

  const isTransferred = useCallback(
    (item: Item) => {
      const summary = summaries[item.item_id];
      return summary ? isItemTransferred(summary) : false;
    },
    [summaries],
  );
  const transferredIds = useMemo(
    () => new Set(items.filter(isTransferred).map((item) => item.item_id)),
    [items, isTransferred],
  );
  const openCount = items.filter((item) => {
    const summary = summaries[item.item_id];
    return summary ? summary.channels.length > 0 : false;
  }).length;
  const activeCount = items.length - transferredIds.size;

  const slots: InventoryItem[] = useMemo(
    () =>
      items.map((i) => ({
        item_id: i.item_id,
        name: i.name,
        quantity: i.quantity,
        condition: i.condition,
        category: i.category,
        image_url: i.images.find((img) => img.is_primary)?.image_url ?? null,
      })),
    [items],
  );

  const selectedIds =
    selected === "all"
      ? items
          .filter((item) => !transferredIds.has(item.item_id))
          .map((item) => item.item_id)
      : [...selected].map(Number);

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-6" />}
        title={t("inventory.emptyTitle")}
        description={t("inventory.emptyBody")}
        action={
          <LinkButton href="/inventory/new">
            <Plus className="size-4" />{t("inventory.addFirst")}</LinkButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-h1">{t("inventory.myStuff")}</h1>
            <p data-numeric className="mt-1 text-body-sm text-ink-muted">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-meta">
            <span className="rounded-pill bg-brand-subtle px-2.5 py-1 font-medium text-ink-brand">
              {openCount} {t("inventory.onTheMarket")}
            </span>
            <span className="rounded-pill bg-surface-sunken px-2.5 py-1 font-medium text-ink-secondary">
              {activeCount - openCount} {t("inventory.notListed")}
            </span>
            {transferredIds.size > 0 ? (
              <span className="rounded-pill bg-surface-sunken px-2.5 py-1 font-medium text-ink-muted">
                {transferredIds.size} transferred
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {selecting ? (
            <Button block variant="secondary" size="sm" onPress={exitSelecting}>
              <X className="size-4" />{t("inventory.cancel")}</Button>
          ) : (
            <Button
              block
              variant="secondary"
              size="sm"
              onPress={() => setSelecting(true)}
            >
              <CheckSquare className="size-4" />{t("inventory.select")}</Button>
          )}
          <LinkButton block size="sm" href="/inventory/new">
            <Plus className="size-4" />{t("inventory.addItem")}</LinkButton>
        </div>
      </header>

      {selecting ? (
        <p className="text-caption text-ink-muted">{t("inventory.selectHint")}</p>
      ) : null}

      <section aria-label={t("inventory.title")}>
        <InventoryGrid
          className="grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
          aria-label={t("inventory.itemsIn")}
          items={slots}
          selectionMode={selecting ? "multiple" : "none"}
          disabledKeys={selecting ? transferredIds : undefined}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          // RAC fires this for Enter as well as click, so the keyboard path is
          // the same as the pointer one.
          onAction={selecting ? undefined : (key) => router.push(`/inventory/${key}`)}
        >
          {(slot: InventoryItem) => {
            const item = items.find((i) => i.item_id === slot.item_id)!;
            const rarity = ITEM_CONDITION[item.condition];
            const summary = summaries[item.item_id];
            const transferred = isTransferred(item);
            const resolution = summary
              ? ([
                  { icon: Tag, label: "Sold", value: summary.sold_quantity },
                  { icon: ArrowLeftRight, label: "Traded", value: summary.traded_quantity },
                  { icon: Gift, label: t("inventory.given"), value: summary.given_quantity },
                ] as const).filter((entry) => entry.value > 0)
              : [];
            return (
              <GridListItem
                id={slot.item_id}
                textValue={
                  transferred
                    ? `${item.name}, ${statusText.of(ITEM_TRANSFERRED_STATUS).label}`
                    : item.name
                }
                style={{ "--slot-edge": rarity.edge } as React.CSSProperties}
                className="group min-w-0 cursor-pointer overflow-hidden rounded-card bg-surface shadow-raised outline-none transition-[transform,box-shadow] duration-[--dur-fast] hover:-translate-y-0.5 hover:shadow-floating focus-visible:ring-2 focus-visible:ring-brand data-[pressed]:translate-y-px data-[selected]:ring-2 data-[selected]:ring-brand"
              >
                {({ isSelected }) => (
                  <>
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
                      <PostImage
                        src={slot.image_url}
                        alt={item.name}
                        aspectRatio={4 / 3}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="h-full"
                      />
                      {transferred ? (
                        <StatusBadge
                          status={ITEM_TRANSFERRED_STATUS}
                          size="sm"
                          className="absolute top-2 left-2 shadow-raised"
                        />
                      ) : summary && summary.channels.length > 0 ? (
                        <ChannelChips
                          channels={summary.channels}
                          className="absolute top-2 left-2"
                        />
                      ) : null}
                      {isSelected ? (
                        <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-pill bg-brand text-on-brand shadow-raised">
                          <Check aria-hidden className="size-4" />
                          <span className="sr-only">Selected</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="flex min-w-0 flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 min-h-[2.9em] flex-1 text-[1.2rem] leading-[1.45] font-semibold group-hover:text-ink-brand">
                          {item.name}
                        </p>
                        <span data-numeric className="shrink-0 text-h3 font-bold text-ink-brand">
                          ×{item.quantity}
                        </span>
                      </div>
                      <span className="truncate text-caption text-ink-muted">{item.category}</span>
                      <span
                        className="w-fit rounded-pill bg-[var(--slot-glow)] px-2 py-0.5 text-meta font-medium text-[var(--slot-edge)]"
                        style={{ "--slot-glow": rarity.glow } as React.CSSProperties}
                      >
                        {statusText.of(rarity).label}
                      </span>
                      {transferred ? (
                        resolution.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2">
                            {resolution.map(({ icon: Icon, label, value }) => (
                              <span key={label} className="flex items-center gap-1.5">
                                <Icon aria-hidden className="size-3.5 shrink-0 text-ink-muted" />
                                <span className="text-meta text-ink-muted">{label}</span>
                                <span data-numeric className="text-body-sm font-semibold">
                                  {value}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : null
                      ) : summary ? (
                        <div className="flex flex-col gap-1 border-t border-line pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                          <span className="flex items-center gap-1.5">
                            <Store aria-hidden className="size-3.5 shrink-0 text-ink-brand" />
                            <span className="text-meta text-ink-muted">Listed</span>
                            <span data-numeric className="text-body-sm font-semibold text-ink-brand">
                              {summary.posted_quantity}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Package aria-hidden className="size-3.5 shrink-0 text-ink-muted" />
                            <span className="text-meta text-ink-muted">Unlisted</span>
                            <span data-numeric className="text-body-sm font-semibold">
                              {summary.available_quantity}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <p className="border-t border-line pt-2 text-meta text-ink-muted">
                          History unavailable
                        </p>
                      )}
                    </div>
                    <span aria-hidden className="block h-1 bg-[var(--slot-edge)]" />
                  </>
                )}
              </GridListItem>
            );
          }}
        </InventoryGrid>
      </section>

      {selecting && selectedIds.length > 0 ? (
        <Surface
          shape="card"
          className="sticky action-bar-bottom z-[20] flex items-center gap-3 p-3"
        >
          <p data-numeric className="flex-1 text-body-sm font-medium">
            {selectedIds.length} selected
          </p>
          <Button variant="ghost" size="sm" onPress={() => setSelected(new Set())}>{t("inventory.clear")}</Button>
          <Button
            size="sm"
            onPress={() => {
              if (selectedIds.length === 1) {
                router.push(`/inventory/${selectedIds[0]}/list`);
              } else {
                // The composer already handles picking terms for several
                // items at once — hand it the selection instead of asking
                // the owner to find them again there.
                router.push(`/post?item=${selectedIds.join(",")}`);
              }
            }}
          >
            <Store className="size-4" />{t("inventory.list")}</Button>
        </Surface>
      ) : null}
    </div>
  );
}
