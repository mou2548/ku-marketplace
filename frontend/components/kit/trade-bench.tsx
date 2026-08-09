"use client";

import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Coins } from "lucide-react";
import { useDragAndDrop } from "react-aria-components";

import type { InventoryItem } from "./inventory-slot";
import { EmptySlot, InventoryGrid, InventorySlot } from "./inventory-slot";
import { Surface } from "./surface";
import { TextInput } from "./field";
import type { MoneyDirection } from "@/lib/offers";
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
 *
 * The sides are named for the viewer, not for the proposer. They used to be
 * `offered`/`wanted`, which meant something different depending on which side
 * of the offer you were on — and one call site duly filled them in backwards,
 * so the same trade drew in two different arrangements.
 */

const DRAG_TYPE = "application/x-ku-item";

export interface TradeBenchProps {
  /** Items still in the viewer's inventory, available to drag on. */
  inventory: InventoryItem[];
  /** What leaves the viewer. The editable, droppable side. */
  youGive: InventoryItem[];
  onYouGiveChange: (next: InventoryItem[]) => void;
  /** What comes to the viewer. Read-only — it is the other side's stack. */
  youGet: InventoryItem[];
  additionalMoney: number;
  onAdditionalMoneyChange: (value: number) => void;
  /** Which way the cash travels, so the field can say whose it is. */
  moneyDirection: MoneyDirection;
  /**
   * The other person, named. Without it both panels are the same plate with
   * the same grid and the direction rests entirely on two words.
   */
  counterpartyName?: string;
  /** Minimum number of empty wells to keep visible on the bench. */
  minSlots?: number;
  isReadOnly?: boolean;
  className?: string;
}

const OVERLINE =
  "text-overline text-ink-muted uppercase";

export function TradeBench({
  inventory,
  youGive,
  onYouGiveChange,
  youGet,
  additionalMoney,
  onAdditionalMoneyChange,
  moneyDirection,
  counterpartyName,
  minSlots = 4,
  isReadOnly = false,
  className,
}: TradeBenchProps) {
  const offeredIds = useMemo(
    () => new Set(youGive.map((i) => i.item_id)),
    [youGive],
  );

  const byId = useMemo(() => {
    const map = new Map<number, InventoryItem>();
    for (const item of [...inventory, ...youGive]) map.set(item.item_id, item);
    return map;
  }, [inventory, youGive]);

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
      if (additions.length) onYouGiveChange([...youGive, ...additions]);
    },
    // Lifting an item back off the bench returns it to the inventory.
    getItems: (keys) =>
      [...keys].map((key) => ({
        [DRAG_TYPE]: String(key),
        "text/plain": byId.get(Number(key))?.name ?? "",
      })),
  });

  const remove = (id: number) =>
    onYouGiveChange(youGive.filter((i) => i.item_id !== id));

  const emptyWells = Math.max(0, minSlots - youGive.length);
  const youPay = moneyDirection === "you-pay";

  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4", className)}>
      {/* ---- What you receive ---- *
       * First, on both axes. The question anyone opens an offer with is what
       * is in it for them, and on a phone the top of the column is the answer
       * they see without scrolling. */}
      <Surface
        as="section"
        shape="panel"
        fill="plate"
        noise
        className="flex-1 p-4"
        aria-label="What you receive"
      >
        <header className="mb-3 border-b-2 border-tone-success-border pb-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[1.125rem] leading-[1.4] font-semibold">
              <ArrowDownLeft
                aria-hidden
                className="size-[1.125rem] shrink-0 text-tone-success-fg"
              />
              You get
            </h3>
            <span data-numeric className="text-[0.8125rem] text-ink-muted">
              {youGet.length} {youGet.length === 1 ? "item" : "items"}
            </span>
          </div>
          <p className={cn("mt-1", OVERLINE)}>
            {counterpartyName ? `From ${counterpartyName}` : "From them"}
          </p>
        </header>

        <InventoryGrid
          aria-label="Items coming to you"
          items={youGet}
          selectionMode="none"
          className="grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4"
        >
          {(item: InventoryItem) => (
            <InventorySlot id={item.item_id} item={item} showName />
          )}
        </InventoryGrid>
      </Surface>

      {/* ---- The seam: cash gap + direction ---- */}
      <div className="flex shrink-0 flex-row items-center gap-3 lg:w-56 lg:flex-col lg:justify-center">
        {/* A bidirectional arrow sat here and stated no direction at all. The
            seam now says which way the cash travels in words, because that is
            the half of the trade the two item piles cannot show. */}
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-pill shadow-raised",
            youPay
              ? "bg-tone-warning-bg text-tone-warning-fg"
              : "bg-tone-success-bg text-tone-success-fg",
          )}
        >
          {youPay ? (
            <ArrowUpRight className="size-5" />
          ) : (
            <ArrowDownLeft className="size-5" />
          )}
        </span>

        {additionalMoney > 0 ? (
          <p className="hidden text-center text-[0.8125rem] leading-[1.5] text-ink-secondary lg:block">
            <span className="font-semibold text-ink">
              {youPay ? "You add" : `${counterpartyName ?? "They"} add${counterpartyName ? "s" : ""}`}
            </span>{" "}
            <span data-numeric>฿{additionalMoney.toLocaleString()}</span>
          </p>
        ) : null}

        {/* Whose money it is, said out loud. The proposer always puts up the
            cash, so on a received offer this is money arriving — labelling it
            "Add cash" told the wrong half of the trade to pay. */}
        <TextInput
          aria-label={
            youPay
              ? "Extra cash you add, in baht"
              : "Extra cash they add, in baht"
          }
          label={youPay ? "You add" : "They add"}
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

      {/* ---- What leaves you ---- */}
      <Surface
        as="section"
        shape="panel"
        fill="plate"
        noise
        className="flex-1 p-4"
        aria-label="Your side of the trade"
      >
        <header className="mb-3 border-b-2 border-tone-neutral-border pb-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[1.125rem] leading-[1.4] font-semibold">
              <ArrowUpRight
                aria-hidden
                className="size-[1.125rem] shrink-0 text-ink-muted"
              />
              You give
            </h3>
            <span data-numeric className="text-[0.8125rem] text-ink-muted">
              {youGive.length} {youGive.length === 1 ? "item" : "items"}
            </span>
          </div>
          <p className={cn("mt-1", OVERLINE)}>
            {counterpartyName ? `To ${counterpartyName}` : "To them"}
          </p>
        </header>

        <InventoryGrid
          aria-label="Items on the trade table"
          items={youGive}
          dragAndDropHooks={benchHooks}
          selectionMode="none"
          renderEmptyState={() => null}
          className="grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4"
        >
          {(item: InventoryItem) => (
            <InventorySlot
              id={item.item_id}
              item={item}
              showName
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
