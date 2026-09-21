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
