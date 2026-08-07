"use client";

import { useMemo } from "react";
import { ArrowLeftRight, Coins } from "lucide-react";
import { useDragAndDrop } from "react-aria-components";

import type { InventoryItem } from "./inventory-slot";
import { EmptySlot, InventoryGrid, InventorySlot } from "./inventory-slot";
import { Surface } from "./surface";
import { TextInput } from "./field";
import { cn } from "@/lib/utils";

/**
 * The trade bench — persona P3, research R5, design principle 6.
 *
 * A trade is two inventories negotiating, not a form. The old UI asked the
 * user to tick items in a list and type a number, which makes fairness
 * impossible to judge. Here both stacks sit facing each other with the cash
 * gap between them, so "who is getting the better deal" is answerable without
 * reading a single label.
 *
 * Layout: side-by-side on desktop, stacked on mobile — 360px cannot fit two
 * stacks abreast. The cash field stays in the middle, on the seam, so the
 * comparison survives the geometry change (docs/design/ia.md §5).
 *
 * Drag-and-drop comes from react-aria-components, which ships a keyboard path
 * (focus an item, Enter to lift, arrow to the target, Enter to drop). A
 * mouse-only bench would fail CLAUDE.md §6.
 */

const DRAG_TYPE = "application/x-ku-item";

export interface TradeBenchProps {
  /** Items still in the proposer's inventory. */
  inventory: InventoryItem[];
  /** Items currently placed on the bench. */
  offered: InventoryItem[];
  onOfferedChange: (next: InventoryItem[]) => void;
  /** What the post owner is putting up. Read-only from this side. */
  wanted: InventoryItem[];
  additionalMoney: number;
  onAdditionalMoneyChange: (value: number) => void;
  /** Minimum number of empty wells to keep visible on the bench. */
  minSlots?: number;
  isReadOnly?: boolean;
  className?: string;
}

export function TradeBench({
  inventory,
  offered,
  onOfferedChange,
  wanted,
  additionalMoney,
  onAdditionalMoneyChange,
  minSlots = 4,
  isReadOnly = false,
  className,
}: TradeBenchProps) {
  const offeredIds = useMemo(
    () => new Set(offered.map((i) => i.item_id)),
    [offered],
  );

  const byId = useMemo(() => {
    const map = new Map<number, InventoryItem>();
    for (const item of [...inventory, ...offered]) map.set(item.item_id, item);
    return map;
  }, [inventory, offered]);

  /** The bench accepts items and adds them to the offer. */
  const { dragAndDropHooks: benchHooks } = useDragAndDrop({
    acceptedDragTypes: [DRAG_TYPE],
    isDisabled: isReadOnly,
    getDropOperation: () => "move",
    onRootDrop: async (event) => {
      const dropped = await Promise.all(
        event.items
          .filter((item) => item.kind === "text")
          .map(async (item) => Number(await item.getText(DRAG_TYPE))),
      );
      const additions = dropped
        .map((id) => byId.get(id))
        .filter((item): item is InventoryItem => !!item && !offeredIds.has(item.item_id));
      if (additions.length) onOfferedChange([...offered, ...additions]);
    },
    // Lifting an item back off the bench returns it to the inventory.
    getItems: (keys) =>
      [...keys].map((key) => ({
        [DRAG_TYPE]: String(key),
        "text/plain": byId.get(Number(key))?.name ?? "",
      })),
  });

  const remove = (id: number) =>
    onOfferedChange(offered.filter((i) => i.item_id !== id));

  const emptyWells = Math.max(0, minSlots - offered.length);

  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4", className)}>
      {/* ---- Your side ---- */}
      <Surface
        as="section"
        shape="panel"
        fill="plate"
        noise
        className="flex-1 p-4"
        aria-label="Your side of the trade"
      >
        <header className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[1.125rem] leading-[1.4] font-semibold">
            You give
          </h3>
          <span data-numeric className="text-[0.8125rem] text-ink-muted">
            {offered.length} items
          </span>
        </header>

        <InventoryGrid
          aria-label="Items on the trade table"
          items={offered}
          dragAndDropHooks={benchHooks}
          selectionMode="none"
          renderEmptyState={() => null}
          className="grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4"
        >
          {(item: InventoryItem) => (
            <InventorySlot
              id={item.item_id}
              item={item}
              onAction={isReadOnly ? undefined : () => remove(item.item_id)}
            />
          )}
        </InventoryGrid>

        {emptyWells > 0 ? (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {Array.from({ length: emptyWells }, (_, i) => (
              <EmptySlot key={i} label="Drag an item here" />
            ))}
          </div>
        ) : null}

        {!isReadOnly ? (
          <p className="mt-3 text-[0.8125rem] leading-[1.5] text-ink-muted">
            Drag items from your inventory, or focus an item and press Enter to move it with the arrow keys
          </p>
        ) : null}
      </Surface>

      {/* ---- The seam: cash gap + direction ---- */}
      <div className="flex shrink-0 flex-row items-center gap-3 lg:w-56 lg:flex-col lg:justify-center">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-pill bg-tone-trade-bg text-tone-trade-fg shadow-raised"
        >
          <ArrowLeftRight className="size-5" />
        </span>

        <TextInput
          aria-label="Extra cash you add, in baht"
          label="Add cash"
          value={additionalMoney ? String(additionalMoney) : ""}
          onChange={(v) => onAdditionalMoneyChange(Number(v.replace(/\D/g, "")) || 0)}
          isReadOnly={isReadOnly}
          inputMode="numeric"
          placeholder="0"
          icon={<Coins className="size-4" />}
          suffix={<span className="text-[0.8125rem]">THB</span>}
          className="flex-1 lg:w-full"
        />
      </div>

      {/* ---- Their side ---- */}
      <Surface
        as="section"
        shape="panel"
        fill="plate"
        noise
        className="flex-1 p-4"
        aria-label="What you receive"
      >
        <header className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[1.125rem] leading-[1.4] font-semibold">
            You get
          </h3>
          <span data-numeric className="text-[0.8125rem] text-ink-muted">
            {wanted.length} items
          </span>
        </header>

        <InventoryGrid
          aria-label="Items from the post"
          items={wanted}
          selectionMode="none"
          className="grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4"
        >
          {(item: InventoryItem) => (
            <InventorySlot id={item.item_id} item={item} />
          )}
        </InventoryGrid>
      </Surface>
    </div>
  );
}

/**
 * The proposer's inventory panel. Kept separate from TradeBench so a page can
 * place it wherever the layout needs — a sheet on mobile, a rail on desktop —
 * while sharing the same drag session.
 */
export function TradeSourcePanel({
  inventory,
  offeredIds,
  onAdd,
  className,
}: {
  inventory: InventoryItem[];
  offeredIds: Set<number>;
  onAdd: (item: InventoryItem) => void;
  className?: string;
}) {
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) =>
      [...keys].map((key) => ({ [DRAG_TYPE]: String(key) })),
  });

  return (
    <Surface as="section" shape="panel" className={cn("p-4", className)}>
      <h3 className="mb-3 text-[1.125rem] leading-[1.4] font-semibold">
        My inventory
      </h3>
      <InventoryGrid
        aria-label="My inventory"
        items={inventory}
        dragAndDropHooks={dragAndDropHooks}
        selectionMode="multiple"
      >
        {(item: InventoryItem) => (
          <InventorySlot
            id={item.item_id}
            item={item}
            isPlaced={offeredIds.has(item.item_id)}
            onAction={() => onAdd(item)}
          />
        )}
      </InventoryGrid>
    </Surface>
  );
}
