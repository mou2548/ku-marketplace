"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Selection } from "react-aria-components";
import { CheckSquare, Package, Plus, Store, X } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { InventoryGrid, InventorySlot } from "@/components/kit/inventory-slot";
import type { InventoryItem } from "@/components/kit/inventory-slot";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import type { Item } from "@/lib/api/types";
import { ITEM_STATUS, type ItemStatus } from "@/lib/status";

/**
 * The slot grid, same as the trade bench: a student who has placed an item on
 * the bench already knows how this screen works, and the rarity border means
 * the same thing in both places.
 *
 * Three behaviours came out of reviewing the built screen:
 *
 *  - **Tapping an item opens it.** Selection used to be the default click
 *    behaviour, so the obvious gesture did the unobvious thing and there was no
 *    way to see an item in full at all.
 *  - **Bulk is behind a button.** Selecting many is the rarer job — persona
 *    P2's end-of-semester clear-out — so it is a mode you enter deliberately.
 *  - **The corner badge is a word.** An icon-only badge in the corner said
 *    nothing to anyone who had not learned it yet; "Listed" and "Unlisted"
 *    are the two states this screen exists to distinguish, so they are spelled
 *    out.
 */
export function InventoryScreen({
  items,
  listedItemIds,
}: {
  items: Item[];
  listedItemIds: number[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Selection>(new Set());
  const listed = useMemo(() => new Set(listedItemIds), [listedItemIds]);

  /**
   * Two states, and only two. `Transferred` is filtered out upstream in
   * page.tsx — an item that has been handed over is not in this inventory at
   * all — so the badge here answers one question: is a post standing for this
   * thing right now?
   */
  const statusOf = (item: Item): Extract<ItemStatus, "Listed" | "Unlisted"> =>
    listed.has(item.item_id) ? "Listed" : "Unlisted";

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
    selected === "all" ? items.map((i) => i.item_id) : [...selected].map(Number);

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
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">{t("inventory.myStuff")}</h1>
          <p data-numeric className="text-caption text-ink-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selecting ? (
            <Button variant="secondary" size="sm" onPress={exitSelecting}>
              <X className="size-4" />{t("inventory.cancel")}</Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => setSelecting(true)}
            >
              <CheckSquare className="size-4" />{t("inventory.select")}</Button>
          )}
          <LinkButton size="sm" href="/inventory/new">
            <Plus className="size-4" />{t("inventory.addItem")}</LinkButton>
        </div>
      </header>

      {selecting ? (
        <p className="text-caption text-ink-muted">{t("inventory.selectHint")}</p>
      ) : null}

      {/* A quiet catalogue shelf. The condition rim keeps the inventory DNA,
          while names and real photos carry the same product-first hierarchy
          as the market feed and the approved ecommerce reference. */}
      <Surface
        as="section"
        shape="panel"
        fill="sunken"
        elevation="none"
        aria-label={t("inventory.title")}
        className="p-3 sm:p-4"
      >
        <InventoryGrid
          aria-label={t("inventory.itemsIn")}
          items={slots}
          selectionMode={selecting ? "multiple" : "none"}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          // RAC fires this for Enter as well as click, so the keyboard path is
          // the same as the pointer one.
          onAction={selecting ? undefined : (key) => router.push(`/inventory/${key}`)}
        >
          {(slot: InventoryItem) => {
            const item = items.find((i) => i.item_id === slot.item_id)!;
            return (
              <InventorySlot
                id={slot.item_id}
                item={slot}
                showName
                badge={
                  /* A slot is about 93px wide at 360px. The labelled badge
                     measured roughly 86px of that and was clamped to 81px by
                     the slot's own max-width, so it truncated its own word
                     while covering most of the photograph — register.md §2:
                     a card does not compete with its own image. The label
                     survives for assistive tech. */
                  <StatusBadge
                    status={ITEM_STATUS[statusOf(item)]}
                    size="sm"
                    iconOnly
                  />
                }
              />
            );
          }}
        </InventoryGrid>
      </Surface>

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
                toast.show(`Preparing to list ${selectedIds.length} items`);
              }
            }}
          >
            <Store className="size-4" />{t("inventory.list")}</Button>
        </Surface>
      ) : null}
    </div>
  );
}
