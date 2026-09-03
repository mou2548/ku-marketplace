"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Store } from "lucide-react";

import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { MasonryGrid, MasonryItem } from "@/components/kit/masonry-grid";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { PostCard } from "@/components/kit/post-card";
import { Surface } from "@/components/kit/surface";
import { Tabs, TabList, SegmentTab, TabPanel } from "@/components/kit/tabs";
import { useStatusText } from "@/lib/i18n/status-text";
import type { ItemCategory, Post } from "@/lib/api/types";
import { ITEM_CONDITION, type ItemCondition } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * E2. Three research findings drive this screen:
 *
 *  - **P1** Ploy searches by course code, not product name. `course_name` is in
 *    the schema and was invisible in the old UI, so it is both a visible chip on
 *    every card and part of what the search box matches.
 *  - **Pinterest-style density** the brief asked for: variable card heights via
 *    CSS multi-column, so the grid looks full rather than gridded.
 *  - **Sale vs Trade must be readable before the tap** — the card chip is
 *    filled with the tone system's success/trade solid (green / teal).
 *
 * Filters live in a sheet on mobile and a rail on desktop; the filter *state*
 * is identical, so nothing is unreachable on a phone.
 */

type Segment = "all" | "sell" | "trade";

const SEGMENTS: Array<{ id: Segment; label: string }> = [
  { id: "all", label: "All" },
  { id: "sell", label: "Sale" },
  { id: "trade", label: "Trade" },
];

const CONDITIONS: ItemCondition[] = [
  "New",
  "Very Good",
  "Good",
  "Acceptable",
  "Poor",
];

export function MarketFeed({ posts }: { posts: Post[] }) {
  const st = useStatusText();
  const [segment, setSegment] = useState<Segment>("all");
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Set<ItemCategory>>(new Set());
  const [conditions, setConditions] = useState<Set<ItemCondition>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return posts.filter((post) => {
      if (segment === "sell" && post.post_type === "TradeOnly") return false;
      if (segment === "trade" && post.post_type === "SellOnly") return false;

      if (categories.size > 0 && !categories.has(post.item.category)) return false;
      if (conditions.size > 0 && !conditions.has(post.item.condition)) return false;

      if (!q) return true;
      // Course code is matched first and exactly the way P1 types it.
      return (
        post.item.course_name?.toLowerCase().includes(q) ||
        post.item.name.toLowerCase().includes(q) ||
        post.description?.toLowerCase().includes(q) ||
        post.wanted_item_offer?.toLowerCase().includes(q)
      );
    });
  }, [posts, segment, query, categories, conditions]);

  // Derived from the data, because the seed's category names and the design
  // document's slugs do not match and the database is the one that is right.
  const availableCategories = useMemo(
    () => [...new Set(posts.map((p) => p.item.category))].sort(),
    [posts],
  );

  const activeFilters = categories.size + conditions.size;

  function toggle<T>(set: Set<T>, value: T, apply: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  /**
   * Post type. Rendered twice on purpose: in the rail with the other filters
   * from `lg` up, and in a bar above the feed below it — the rail is hidden on
   * a phone, and burying the primary filter in the sheet would cost a tap on
   * the control people reach for first.
   */
  const segmentTabs = (
    <Tabs
      selectedKey={segment}
      onSelectionChange={(k) => setSegment(k as Segment)}
      className="min-w-0 flex-1"
    >
      <TabList aria-label="Post type" variant="segment">
        {SEGMENTS.map((s) => (
          <SegmentTab key={s.id} id={s.id}>
            {s.label}
          </SegmentTab>
        ))}
      </TabList>
      {SEGMENTS.map((s) => (
        <TabPanel key={s.id} id={s.id} className="hidden" />
      ))}
    </Tabs>
  );

  const filterControls = (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-overline text-ink-muted uppercase">
          Category
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {availableCategories.map((cat) => (
            <FilterChip
              key={cat}
              isActive={categories.has(cat)}
              onToggle={() => toggle(categories, cat, setCategories)}
            >
              {cat}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-overline text-ink-muted uppercase">
          Condition
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => (
            <FilterChip
              key={c}
              isActive={conditions.has(c)}
              onToggle={() => toggle(conditions, c, setConditions)}
            >
              {st.of(ITEM_CONDITION[c]).label}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      {activeFilters > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            setCategories(new Set());
            setConditions(new Set());
          }}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Phone only: post type plus the filter sheet. From `lg` both move into
          the rail and the search takes the top of the feed column. */}
      <div className="flex items-center gap-2 lg:hidden">
        {segmentTabs}

        <OverlayTrigger>
          <Button variant="secondary" size="icon" aria-label="Filters">
            <span className="relative">
              <SlidersHorizontal className="size-5" />
              {activeFilters > 0 ? (
                <span
                  aria-hidden
                  className="absolute -top-1.5 -right-2 grid size-4 place-items-center rounded-pill bg-brand text-meta font-semibold text-on-brand"
                >
                  {activeFilters}
                </span>
              ) : null}
            </span>
          </Button>
          <Overlay title="Filters" variant="sheet">
            {filterControls}
          </Overlay>
        </OverlayTrigger>
      </div>

      <div className="flex gap-6">
        {/* The rail was bare chips on the page background — the exact "lone
            hairline, no depth" failure CLAUDE.md §3.1 names. It is a panel. */}
        <aside className="hidden w-64 shrink-0 lg:block xl:w-72">
          <Surface
            as="div"
            shape="panel"
            fill="plate"
            noise
            className="sticky top-20 flex flex-col gap-5 p-4"
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-overline text-ink-muted uppercase">
                Showing
              </legend>
              {segmentTabs}
            </fieldset>

            {filterControls}
          </Surface>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Search leads the feed column and takes its full width — it was a
              capped bar sitting above the rail, in line with nothing.

              White and raised, not sunken. Inputs are sunken wells everywhere
              else in the app (components.md §3) and that is right on a white
              card, but this one sits straight on the page: `--bg-surface-sunken`
              is #f6f8f7 and the page is #f4f7f5, which is 1.01:1 — the field
              was invisible. It lifts off the page instead. */}
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search by item name or course code"
              placeholder="Search by item name or course code, e.g. 01417111"
              className="h-12 w-full rounded-pill bg-surface pr-4 pl-11 text-body shadow-raised"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Store className="size-6" />}
              title="Nothing matches that search"
              description="Try removing a filter, or search by course code instead of the book title. People name their posts differently."
            />
          ) : (
            <>
              <p className="mb-3 text-caption text-ink-muted" data-numeric>
                {filtered.length} results
              </p>
              <MasonryGrid columns={{ base: 2, md: 3, lg: 4, xl: 5 }}>
                {filtered.map((post) => (
                  <MasonryItem key={post.post_id}>
                    <PostCard
                      postId={post.post_id}
                      name={post.item.name}
                      price={post.price}
                      postType={post.post_type}
                      condition={post.item.condition}
                      imageUrl={post.item.images[0]?.image_url}
                      description={post.description}
                      courseName={post.item.course_name}
                      wantedItemOffer={post.wanted_item_offer}
                      seller={{
                        name: post.seller.name,
                        isVerified: post.seller.isVerified,
                        faculty: post.seller.faculty,
                      }}
                    />
                  </MasonryItem>
                ))}
              </MasonryGrid>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The dot used to carry the condition ramp. CLAUDE.md §3.9 confines rarity
 * colour to inventory and trade, and the feed is neither — a filter row is
 * chrome, and it was spending the screen's one saturated element on a legend.
 * The label already names the condition.
 */
function FilterChip({
  isActive,
  onToggle,
  children,
}: {
  isActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onToggle}
      className={cn(
        // Same two fixes as history-list.tsx's filter chip: 44px, and
        // green-700 rather than green-600 under a 13px label.
        "flex min-h-11 items-center gap-1.5 rounded-pill px-3.5 text-caption font-medium",
        "transition-colors duration-[--dur-fast]",
        isActive
          ? "bg-brand-band text-on-brand-strong shadow-raised"
          : "bg-surface-sunken text-ink-secondary shadow-sunken hover:bg-gray-200",
      )}
    >
      {children}
    </button>
  );
}
