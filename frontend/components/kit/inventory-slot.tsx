"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import {
  GridList,
  GridListItem,
  type GridListItemProps,
  type GridListProps,
} from "react-aria-components";

import { ITEM_CONDITION, type ItemCondition } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * The game-inventory surface (persona P3, "game DNA, modern execution").
 *
 * Two things make it read as an inventory rather than a product grid:
 *   1. slots are sunken wells with a lit rim, not raised cards
 *   2. the border colour IS the item condition — rarity at a glance
 *
 * Built on react-aria-components' GridList because it gives arrow-key
 * navigation and makes each slot a keyboard-operable button (Enter fires its
 * action), so placing and removing items on the trade bench works without a
 * pointer — CLAUDE.md §6.
 *
 * Condition is never conveyed by colour alone; it is in the accessible name.
 */

export interface InventoryItem {
  item_id: number;
  name: string;
  quantity: number;
  condition: ItemCondition;
  category: string;
  image_url?: string | null;
}

export function InventoryGrid<T extends object>({
  className,
  ...props
}: GridListProps<T>) {
  return (
    <GridList
      {...props}
      // 3 columns at 360px, opening up on larger screens. Slots stay square.
      className={cn(
        "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-3 lg:grid-cols-6",
        className,
      )}
    />
  );
}

export interface InventorySlotProps
  extends Omit<GridListItemProps, "children" | "textValue"> {
  item: InventoryItem;
  /** Dims the slot and blocks selection — e.g. already placed on the bench. */
  isPlaced?: boolean;
  /**
   * Rendered in the top-right corner. Used for the listed/unlisted state, so
   * "is this thing on the market?" is answerable from the grid rather than
   * only after opening the item.
   */
  badge?: React.ReactNode;
  /**
   * Print the item name under the well. Off in the inventory grid, where the
   * slot is a thumbnail you are about to open anyway; on for the trade bench,
   * where "who is giving what" is the entire question and the name previously
   * existed only in the accessible name.
   */
  showName?: boolean;
}

export function InventorySlot({
  item,
  isPlaced = false,
  badge,
  showName = false,
  className,
  ...props
}: InventorySlotProps) {
  const rarity = ITEM_CONDITION[item.condition];

  return (
    <GridListItem
      {...props}
      textValue={`${item.name}, condition ${rarity.label}, quantity ${item.quantity}`}
      style={
        {
          "--slot-edge": rarity.edge,
          "--slot-glow": rarity.glow,
        } as React.CSSProperties
      }
      className={cn(
        "group cursor-pointer rounded-slot",
        "transition-transform duration-[--dur-fast] ease-[--ease-spring]",
        "hover:-translate-y-0.5 data-[pressed]:scale-95",
        "data-[selected]:-translate-y-1 data-[selected]:brightness-105",
        showName ? "flex flex-col gap-1.5" : "relative aspect-square",
        isPlaced && "pointer-events-none opacity-35 grayscale",
        className,
      )}
    >
      {/* The well. Its own element only when a caption sits below it, so the
          sunken fill and the rarity shadow stay square either way. */}
      <span
        className={cn(
          "bg-surface-sunken",
          "shadow-sunken [box-shadow:var(--shadow-sunken),var(--shadow-rarity)]",
          showName
            ? "relative block aspect-square rounded-slot"
            : "absolute inset-0 rounded-slot",
        )}
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt=""
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
            className="rounded-slot object-cover p-1"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center text-overline text-ink-disabled uppercase"
          >
            {item.category.slice(0, 3)}
          </span>
        )}

        {item.quantity > 1 ? (
          <span
            aria-hidden
            data-numeric
            className="absolute right-1 bottom-1 rounded-chip bg-surface-inverse/85 px-1.5 py-0.5 text-meta font-semibold text-white"
          >
            ×{item.quantity}
          </span>
        ) : null}

        {badge ? (
          <span className="pointer-events-none absolute top-1.5 right-1.5 z-[1] max-w-[calc(100%-0.75rem)] truncate">
            {badge}
          </span>
        ) : null}

        {/* Rarity rim. Separate element so it can animate independently of the
            image without repainting it. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-slot ring-1 ring-[var(--slot-edge)] ring-inset"
        />
      </span>

      {showName ? (
        <span
          aria-hidden
          className="line-clamp-2 px-0.5 text-meta leading-[1.4] text-ink-secondary"
        >
          {item.name}
        </span>
      ) : null}
    </GridListItem>
  );
}

/** An empty well on the trade bench — a placeholder for a not-yet-placed item. */
export function EmptySlot({
  label = "Empty slot",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid aspect-square place-items-center rounded-slot",
        "border-2 border-dashed border-line-default bg-surface-sunken/60",
        "transition-colors duration-[--dur-fast]",
        className,
      )}
      title={label}
    >
      <Plus className="size-4 text-ink-disabled" />
    </div>
  );
}
