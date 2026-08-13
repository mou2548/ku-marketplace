"use client";

import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  type TabListProps,
  type TabPanelProps,
  type TabProps,
  type TabsProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

/**
 * Two shapes, one behaviour:
 *
 *  - `segment` — a raised pill sliding inside a sunken track. Used for the
 *    buyer/seller filter (IA decision D3) and the Market segments, where the
 *    options are peers and the set is short.
 *  - `underline` — used where a tab can carry a count, like the Offers inbox
 *    (research R6), because a pill with a badge inside gets cramped.
 *
 * The tab list scrolls horizontally on mobile rather than wrapping; a wrapped
 * tab row reads as two unrelated rows of buttons.
 */

export function Tabs({ className, ...props }: TabsProps) {
  return <AriaTabs {...props} className={cn("flex flex-col gap-4", className)} />;
}

export function TabList<T extends object>({
  className,
  variant = "segment",
  ...props
}: TabListProps<T> & { variant?: "segment" | "underline" }) {
  return (
    <AriaTabList
      {...props}
      data-variant={variant}
      className={cn(
        "flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        variant === "segment" &&
          "w-fit max-w-full rounded-pill bg-surface-sunken p-1 shadow-sunken",
        variant === "underline" && "gap-4 border-b border-line",
        className,
      )}
    />
  );
}

export function Tab({ className, ...props }: TabProps) {
  return (
    <AriaTab
      {...props}
      className={cn(
        "cursor-pointer whitespace-nowrap outline-none transition-all duration-[--dur-fast] ease-[--ease-out]",
        // segment
        "group-data-[variant=segment]:rounded-pill",
        "data-[selected]:font-semibold",
        // Both variants share the same padding so switching does not reflow.
        "flex min-h-11 items-center gap-2 px-4 text-[0.9375rem] text-ink-muted",
        "data-[selected]:text-ink",
        "data-[hovered]:text-ink",
        className,
      )}
    />
  );
}

/** Segment-shaped tab: pill fill when selected. */
export function SegmentTab({ className, ...props }: TabProps) {
  return (
    <Tab
      {...props}
      className={cn(
        "rounded-pill",
        "data-[selected]:bg-surface data-[selected]:shadow-raised data-[selected]:text-ink",
        className,
      )}
    />
  );
}

/** Underline-shaped tab: 2px brand rule when selected. */
export function UnderlineTab({ className, ...props }: TabProps) {
  return (
    <Tab
      {...props}
      className={cn(
        "-mb-px border-b-2 border-transparent px-1",
        "data-[selected]:border-brand data-[selected]:text-ink",
        className,
      )}
    />
  );
}

export function TabPanel({ className, ...props }: TabPanelProps) {
  return <AriaTabPanel {...props} className={cn("outline-none", className)} />;
}

/** A count badge for use inside an UnderlineTab. */
export function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-numeric
      className="rounded-pill bg-gray-200 px-1.5 text-[0.75rem] font-semibold text-ink-secondary group-data-[selected]:bg-brand-subtle group-data-[selected]:text-ink-brand"
    >
      {children}
    </span>
  );
}
