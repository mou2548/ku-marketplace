"use client";

import { useSyncExternalStore } from "react";

import { packColumns } from "@/lib/masonry";
import { cn } from "@/lib/utils";

/**
 * Pinterest-style feed: cards vary in height with their image aspect ratio and
 * description length, and the grid stays dense.
 *
 * Implemented with CSS multi-column rather than a JS masonry library because
 * a JS layout pass measures after paint, which guarantees a layout shift. The
 * budget is CLS <= 0.05 (CLAUDE.md §7), so the browser has to do the packing.
 *
 * The tradeoff is real and worth naming: columns fill top-to-bottom, so reading
 * order is column-major, not newest-first across the row. For a browse feed
 * with no inherent sequence that is acceptable. Anywhere order carries meaning
 * — offers, history, chat — use a normal grid instead.
 */
export interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  /** Mobile is the base. 2 columns at 360px is the design, not a fallback. */
  columns?: { base: 2 | 1; md?: 2 | 3; lg?: 3 | 4 | 5; xl?: 4 | 5 | 6 };
}

const COLS = {
  base: { 1: "columns-1", 2: "columns-2" },
  md: { 2: "md:columns-2", 3: "md:columns-3" },
  lg: { 3: "lg:columns-3", 4: "lg:columns-4", 5: "lg:columns-5" },
  xl: { 4: "xl:columns-4", 5: "xl:columns-5", 6: "xl:columns-6" },
} as const;

export function MasonryGrid({
  children,
  className,
  columns = { base: 2, md: 3, lg: 4, xl: 5 },
}: MasonryGridProps) {
  return (
    <div
      className={cn(
        "gap-3 md:gap-4 [column-fill:balance]",
        COLS.base[columns.base],
        columns.md && COLS.md[columns.md],
        columns.lg && COLS.lg[columns.lg],
        columns.xl && COLS.xl[columns.xl],
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Every direct child of MasonryGrid must be wrapped in this. `break-inside`
 * is what stops a card from being sliced across a column boundary, and the
 * bottom margin is the row gap (column-gap alone does not apply between
 * stacked items in a multi-column flow).
 */
export function MasonryItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 break-inside-avoid md:mb-4", className)}>
      {children}
    </div>
  );
}

const BREAKPOINTS: Array<[query: string, columns: number]> = [
  ["(min-width: 1280px)", 5],
  ["(min-width: 1024px)", 4],
  ["(min-width: 768px)", 3],
];

function columnCount() {
  for (const [query, columns] of BREAKPOINTS)
    if (window.matchMedia(query).matches) return columns;
  return 2;
}

function subscribe(onChange: () => void) {
  const lists = BREAKPOINTS.map(([query]) => window.matchMedia(query));
  for (const list of lists) list.addEventListener("change", onChange);
  return () => {
    for (const list of lists) list.removeEventListener("change", onChange);
  };
}

/**
 * Masonry that reads left to right. The first row is the first items in
 * order, then each item goes to the shortest column (or, without
 * `estimateHeight`, the next column in turn), so the columns pack tightly.
 * `MasonryGrid` above fills column by column instead, which puts the 2nd item
 * under the 1st.
 *
 * The column count needs the viewport, which the server does not know. The
 * first render used to be a plain row-major grid that the masonry replaced
 * after hydration, and every card below the first row jumped up: CLS
 * 0.054-0.096 on /feed at 1024 and 1280 (audit P02, budget 0.05).
 *
 * Now the first render already is the masonry, once per breakpoint, with CSS
 * showing only the one that matches the width. Packing is prefix-stable
 * (`packColumns`): the first k items land in the same places whatever comes
 * after them, so the first rows of the full layout are exactly that
 * pre-render, and after hydration the matching layout keeps its
 * elements (same keys) and only grows downward. To keep the HTML small, the
 * pre-render holds the first FIRST_PAINT_ROWS rows; the rest arrive below the
 * fold, which moves nothing already on screen.
 */
const LAYOUTS: Array<[columns: number, visibility: string, columnWidth: number]> = [
  // The column width is a typical one for the breakpoint, used only to
  // estimate card heights for packing; the real width is whatever flex gives.
  [2, "flex md:hidden", 165],
  [3, "hidden md:flex lg:hidden", 235],
  [4, "hidden lg:flex xl:hidden", 230],
  [5, "hidden xl:flex", 235],
];

/** Rows the pre-hydration layouts carry; enough to fill a tall first screen. */
const FIRST_PAINT_ROWS = 4;

export function MasonryRows<T>({
  items,
  getKey,
  renderItem,
  estimateHeight,
  className,
}: {
  items: T[];
  getKey: (item: T) => React.Key;
  renderItem: (item: T) => React.ReactNode;
  /**
   * The item's rendered height in px at this column width. Given, each item
   * goes to the shortest column (`packColumns`); left out, items are dealt
   * in turn. It must depend only on the item, so the server and the client
   * pack the same way.
   */
  estimateHeight?: (item: T, columnWidth: number) => number;
  className?: string;
}) {
  const columns = useSyncExternalStore(subscribe, columnCount, () => 0);

  return (
    <div className={className}>
      {LAYOUTS.map(([count, visibility, columnWidth]) => {
        const active = columns === count;
        // Before the width is known every layout renders its first rows and
        // CSS picks one; after, only the matching layout renders at all.
        if (columns !== 0 && !active) return null;
        const shown = active ? items : items.slice(0, count * FIRST_PAINT_ROWS);
        const heights = shown.map((item) =>
          estimateHeight ? estimateHeight(item, columnWidth) : 1,
        );
        const stacks = packColumns(heights, count).map((indexes) =>
          indexes.map((index) => shown[index]),
        );
        return (
          <div
            key={count}
            className={cn(
              "items-start gap-3 md:gap-4",
              active ? "flex" : visibility,
            )}
          >
            {stacks.map((stack, column) => (
              <div key={column} className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
                {stack.map((item) => (
                  <div key={getKey(item)}>{renderItem(item)}</div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
