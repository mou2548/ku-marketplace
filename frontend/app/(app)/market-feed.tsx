"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Store } from "lucide-react";

import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { MasonryGrid, MasonryItem } from "@/components/kit/masonry-grid";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { PostCard } from "@/components/kit/post-card";
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

const SEGMENTS: Array<{ id: Segment; labelKey: string }> = [
  { id: "all", labelKey: "feed.all" },
  { id: "sell", labelKey: "feed.sale" },
  { id: "trade", labelKey: "feed.trade" },
];

const CONDITIONS: ItemCondition[] = [
  "New",
  "Good",
  "Acceptable",
  "Poor",
];

export function MarketFeed({ posts }: { posts: Post[] }) {
  const t = useTranslations();
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
      <TabList aria-label={t("feed.postType")} variant="segment">
        {SEGMENTS.map((s) => (
          <SegmentTab key={s.id} id={s.id}>
            {t(s.labelKey)}
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
        <legend className="mb-1 text-overline text-ink-muted uppercase">{t("feed.category")}</legend>
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
        <legend className="mb-1 text-overline text-ink-muted uppercase">{t("feed.condition")}</legend>
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
        >{t("feed.clearFilters")}</Button>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-5">
      <header className="flex flex-col gap-1 px-1 pt-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <h1 className="text-h1 text-ink text-balance">{t("feed.title")}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-ink-muted">
            {t("feed.subtitle")}
          </p>
        </div>
        <p className="shrink-0 text-caption text-ink-muted" data-numeric aria-live="polite">
          {t("feed.resultCount", { count: filtered.length })}
        </p>
      </header>

      <div className="sticky top-[4.25rem] z-[20] -mx-3 flex flex-col gap-3 border-y border-line bg-page px-3 py-3 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("feed.searchLabel")}
              placeholder={t("feed.searchPlaceholder")}
              className="h-12 w-full rounded-pill bg-surface pr-4 pl-11 text-body text-ink shadow-raised placeholder:text-ink-muted"
            />
          </div>

          <OverlayTrigger>
            <Button
              variant="secondary"
              size="icon"
              pill
              aria-label={t("feed.filters")}
            >
              <span className="relative">
                <SlidersHorizontal className="size-5" />
                {activeFilters > 0 ? (
                  <span
                    aria-hidden
                    className="absolute -top-2 -right-2 grid min-w-4 place-items-center rounded-pill bg-brand px-1 text-meta font-semibold text-on-brand"
                  >
                    {activeFilters}
                  </span>
                ) : null}
              </span>
            </Button>
            <Overlay title={t("feed.filters")}>
              {filterControls}
            </Overlay>
          </OverlayTrigger>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="shrink-0">{segmentTabs}</div>
          <span aria-hidden className="h-7 w-px shrink-0 bg-line" />
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
      </div>

      {filtered.length === 0 ? (
            <EmptyState
              icon={<Store className="size-6" />}
              title={t("feed.emptyTitle")}
              description={t("feed.emptyBody")}
            />
          ) : (
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
          )}
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
