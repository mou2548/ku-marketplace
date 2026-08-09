"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Selection } from "react-aria-components";
import { CheckSquare, Package, Plus, Store, X } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { EmptySlot, InventoryGrid, InventorySlot } from "@/components/kit/inventory-slot";
import type { InventoryItem } from "@/components/kit/inventory-slot";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import type { Item } from "@/lib/api/types";
import { ITEM_STATUS, type ItemStatus } from "@/lib/status";

/**
 * The slot grid, same as the trade bench: a student who has dragged an item
 * onto the bench already knows how this screen works, and the rarity border
 * means the same thing in both places.
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

  /**
   * Pad the stash out to three rows at the widest breakpoint, so the panel is
   * a container with room in it rather than a strip that hugs its contents.
   */
  const emptyWells = Math.max(0, 18 - slots.length);

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
        title="Your inventory is empty"
        description="Put what you own in here first. Later you decide whether to sell it, open it to trades, or just keep it."
        action={
          <LinkButton href="/inventory/new">
            <Plus className="size-4" />
            Add your first item
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
            My stuff
          </h1>
          <p data-numeric className="text-[0.8125rem] text-ink-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selecting ? (
            <Button variant="secondary" size="sm" onPress={exitSelecting}>
              <X className="size-4" />
              Cancel
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => setSelecting(true)}
            >
              <CheckSquare className="size-4" />
              Select
            </Button>
          )}
          <LinkButton size="sm" href="/inventory/new">
            <Plus className="size-4" />
            Add an item
          </LinkButton>
        </div>
      </header>

      {selecting ? (
        <p className="text-[0.8125rem] text-ink-muted">
          Pick the items you want to handle together, then choose an action.
        </p>
      ) : null}

      {/* The stash is the one surface that has to read as a game panel
          (CLAUDE.md §3.3, §3.8) — a lit plate with the slots sunk into it,
          not a grid of thumbnails floating on the page background. */}
      <Surface
        as="section"
        shape="panel"
        fill="plate"
        noise
        aria-label="Inventory"
        className="p-4"
      >
        <InventoryGrid
          aria-label="Items in my inventory"
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
                badge={
                  <StatusBadge
                    status={ITEM_STATUS[statusOf(item)]}
                    variant="solid"
                    size="sm"
                  />
                }
              />
            );
          }}
        </InventoryGrid>

        {/* A stash shows the room it has left. Without the empty wells the
            panel collapsed to a single strip of thumbnails and the screen read
            as a short list rather than a container you are filling. Count
            matches InventoryGrid's own breakpoints so the rows stay whole. */}
        {emptyWells > 0 ? (
          <div
            aria-hidden
            className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-3 lg:grid-cols-6"
          >
            {Array.from({ length: emptyWells }, (_, i) => (
              <EmptySlot key={i} label="Empty slot" />
            ))}
          </div>
        ) : null}
      </Surface>

      {selecting && selectedIds.length > 0 ? (
        <Surface
          shape="card"
          className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-[20] flex items-center gap-3 p-3"
        >
          <p data-numeric className="flex-1 text-[0.875rem] font-medium">
            {selectedIds.length} selected
          </p>
          <Button variant="ghost" size="sm" onPress={() => setSelected(new Set())}>
            Clear
          </Button>
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
            <Store className="size-4" />
            List
          </Button>
        </Surface>
      ) : null}
    </div>
  );
}
