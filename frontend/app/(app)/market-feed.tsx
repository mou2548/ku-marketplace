"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { ListBox, Popover, Select, SelectValue } from "react-aria-components";

import { Button } from "@/components/kit/button";
import { SelectOption, Switch } from "@/components/kit/choice";
import { EmptyState } from "@/components/kit/empty-state";
import { TextInput } from "@/components/kit/field";
import { MasonryGrid, MasonryItem } from "@/components/kit/masonry-grid";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { PostCard } from "@/components/kit/post-card";
import { SearchField } from "@/components/kit/search-field";
import { Tabs, TabList, SegmentTab, TabPanel } from "@/components/kit/tabs";
import { useCategoryLabel } from "@/lib/i18n/category-text";
import { useStatusText } from "@/lib/i18n/status-text";
import type { ItemCategory, Post } from "@/lib/api/types";
import { ITEM_CONDITION, type ItemCondition } from "@/lib/status";
import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import {
  CONDITIONS,
  SEGMENTS,
  SORTS,
  activeFilterCount,
  emptyFilters,
  feedParamsToString,
  filterPosts,
  hasPriceBound,
  sortPosts,
  type FeedFilters,
  type Segment,
  type SortKey,
} from "@/lib/feed-filters";

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
 * Every filter applies the instant it is tapped, wherever it is tapped. The
 * sheet used to hold a *draft* copy, so the same category chip committed
 * immediately in the bar and needed a confirm button four inches lower — one
 * control, two rules, no way to tell them apart. The sheet is now a second view
 * of one state, and the row of removable pills below the search box is the only
 * place that has to be read to know what is being filtered.
 */

export function MarketFeed({
  posts,
  initialFilters,
  initialSort,
}: {
  posts: Post[];
  initialFilters: FeedFilters;
  initialSort: SortKey;
}) {
  const t = useTranslations();
  const st = useStatusText();
  const categoryLabel = useCategoryLabel();
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [filterScroll, setFilterScroll] = useState({ left: false, right: false });

  const filtered = useMemo(
    () => sortPosts(filterPosts(posts, filters), sort),
    [posts, filters, sort],
  );

  /**
   * Facet counts: how many results each chip would leave, measured against
   * every *other* filter. A chip that leads to an empty feed is the one thing a
   * filter bar must not do silently, and the count is cheap — the whole list is
   * already in memory, there is no endpoint to ask.
   */
  const categoryCounts = useMemo(
    () => countBy(filterPosts(posts, { ...filters, categories: new Set() }), (p) => p.item.category),
    [posts, filters],
  );

  const conditionCounts = useMemo(
    () => countBy(filterPosts(posts, { ...filters, conditions: new Set() }), (p) => p.item.condition),
    [posts, filters],
  );

  // Show every inventory category, including those without current listings.
  // Keep additional categories from existing data available for filtering.
  const availableCategories = useMemo(
    () => [...new Set<string>([...CATEGORY_OPTIONS, ...posts.map((p) => p.item.category)])],
    [posts],
  );

  const activeFilters = activeFilterCount(filters);

  /**
   * The feed's state is the URL, so a filtered feed can be sent to someone and
   * survives a reload. `replaceState` rather than a router push: the filtering
   * is entirely client-side, so there is nothing to re-fetch, and pushing would
   * put one history entry behind every keystroke in the search box.
   */
  useEffect(() => {
    const query = feedParamsToString(filters, sort);
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }, [filters, sort]);

  useEffect(() => {
    const bar = filterBarRef.current;
    if (!bar) return;

    const update = () => {
      const maxScroll = bar.scrollWidth - bar.clientWidth;
      setFilterScroll({
        left: bar.scrollLeft > 4,
        right: bar.scrollLeft < maxScroll - 4,
      });
    };

    update();
    bar.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(bar);

    return () => {
      bar.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [availableCategories]);

  function update(patch: Partial<FeedFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function toggleCategory(category: ItemCategory) {
    update({ categories: toggled(filters.categories, category) });
  }

  function toggleCondition(condition: ItemCondition) {
    update({ conditions: toggled(filters.conditions, condition) });
  }

  /**
   * Everything that is currently narrowing the feed, in one line, each item its
   * own undo. This is the only surface that shows *all* of it: post type lives
   * in the bar, condition and price live in the sheet, and before this row a
   * condition chosen in the sheet left no trace on screen at all.
   */
  const activePills: Array<{ key: string; label: string; remove: () => void }> = [];

  if (filters.segment !== "all") {
    activePills.push({
      key: `segment:${filters.segment}`,
      label: t(SEGMENTS.find((s) => s.id === filters.segment)!.labelKey),
      remove: () => update({ segment: "all" }),
    });
  }

  if (filters.query.trim()) {
    activePills.push({
      key: "query",
      label: t("feed.chipSearch", { query: filters.query.trim() }),
      remove: () => update({ query: "" }),
    });
  }

  for (const category of filters.categories) {
    activePills.push({
      key: `category:${category}`,
      label: categoryLabel(category),
      remove: () => toggleCategory(category),
    });
  }

  for (const condition of filters.conditions) {
    activePills.push({
      key: `condition:${condition}`,
      label: st.of(ITEM_CONDITION[condition]).label,
      remove: () => toggleCondition(condition),
    });
  }

  if (hasPriceBound(filters)) {
    activePills.push({
      key: "price",
      label: priceLabel(t, filters),
      remove: () => update({ minPrice: null, maxPrice: null }),
    });
  }

  if (filters.inStockOnly) {
    activePills.push({
      key: "stock",
      label: t("feed.inStockOnly"),
      remove: () => update({ inStockOnly: false }),
    });
  }

  if (filters.verifiedOnly) {
    activePills.push({
      key: "verified",
      label: t("feed.verifiedOnly"),
      remove: () => update({ verifiedOnly: false }),
    });
  }

  /**
   * Post type. Rendered in the bar rather than the sheet because it is the
   * filter people reach for first, and the bar is reachable on a phone without
   * opening anything.
   */
  const segmentTabs = (
    <Tabs
      selectedKey={filters.segment}
      onSelectionChange={(k) => update({ segment: k as Segment })}
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
              isActive={filters.categories.has(cat)}
              count={categoryCounts.get(cat) ?? 0}
              onToggle={() => toggleCategory(cat)}
            >
              {categoryLabel(cat)}
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
              isActive={filters.conditions.has(c)}
              count={conditionCounts.get(c) ?? 0}
              onToggle={() => toggleCondition(c)}
            >
              {st.of(ITEM_CONDITION[c]).label}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-overline text-ink-muted uppercase">{t("feed.priceRange")}</legend>
        {/*
          Two number fields, not a two-handle slider: a slider needs the range to
          be known before it can be aimed, and two handles inside a 360px well
          are below the 44px target the rest of the app holds to.
        */}
        <div className="flex items-center gap-2">
          <TextInput
            aria-label={t("feed.priceMin")}
            placeholder={t("feed.priceMin")}
            inputMode="numeric"
            value={filters.minPrice === null ? "" : String(filters.minPrice)}
            onChange={(value) => update({ minPrice: parsePriceInput(value) })}
            className="min-w-0 flex-1"
          />
          <span aria-hidden className="text-ink-muted">–</span>
          <TextInput
            aria-label={t("feed.priceMax")}
            placeholder={t("feed.priceMax")}
            inputMode="numeric"
            value={filters.maxPrice === null ? "" : String(filters.maxPrice)}
            onChange={(value) => update({ maxPrice: parsePriceInput(value) })}
            className="min-w-0 flex-1"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-overline text-ink-muted uppercase">{t("feed.moreOptions")}</legend>
        <Switch
          isSelected={filters.inStockOnly}
          onChange={(inStockOnly) => update({ inStockOnly })}
        >
          {t("feed.inStockOnly")}
        </Switch>
        <Switch
          isSelected={filters.verifiedOnly}
          onChange={(verifiedOnly) => update({ verifiedOnly })}
        >
          {t("feed.verifiedOnly")}
        </Switch>
      </fieldset>
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
          <SearchField
            value={filters.query}
            onChange={(query) => update({ query })}
            label={t("feed.searchLabel")}
            placeholder={t("feed.searchPlaceholder")}
            className="min-w-0 flex-1 bg-surface shadow-raised"
          />

          <SortSelect
            label={t("feed.sortLabel")}
            value={sort}
            onChange={setSort}
            options={SORTS.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
          />

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
            <Overlay
              title={t("feed.filters")}
              size="sm"
              footer={
                <>
                  <Button
                    variant="ghost"
                    onPress={() => setFilters(emptyFilters())}
                    isDisabled={activeFilters === 0}
                  >
                    {t("feed.clearAll")}
                  </Button>
                  {/*
                    Nothing to commit — the sheet edits live state. The count is
                    here because the header that carries it is scrolled off on a
                    phone while the sheet is open.
                  */}
                  <Button slot="close">
                    {t("feed.showResults", { count: filtered.length })}
                  </Button>
                </>
              }
            >
              {filterControls}
            </Overlay>
          </OverlayTrigger>
        </div>

        <div className="relative min-w-0">
          <div
            ref={filterBarRef}
            className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="shrink-0">{segmentTabs}</div>
            <span aria-hidden className="h-7 w-px shrink-0 bg-line" />
            {availableCategories.map((cat) => (
              <FilterChip
                key={cat}
                isActive={filters.categories.has(cat)}
                count={categoryCounts.get(cat) ?? 0}
                onToggle={() => toggleCategory(cat)}
              >
                {categoryLabel(cat)}
              </FilterChip>
            ))}
          </div>

          {filterScroll.left ? (
            <FilterScrollButton
              direction="left"
              onPress={() =>
                filterBarRef.current?.scrollBy({ left: -240, behavior: "smooth" })
              }
            />
          ) : null}
          {filterScroll.right ? (
            <FilterScrollButton
              direction="right"
              onPress={() =>
                filterBarRef.current?.scrollBy({ left: 240, behavior: "smooth" })
              }
            />
          ) : null}
        </div>

        {activePills.length > 0 ? (
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-caption text-ink-muted">
              {t("feed.activeFilters")}
            </span>
            {activePills.map((pill) => (
              <ActiveFilterPill
                key={pill.key}
                label={pill.label}
                removeLabel={t("feed.removeFilter", { label: pill.label })}
                onRemove={pill.remove}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              pill
              className="shrink-0"
              onPress={() => setFilters(emptyFilters())}
            >
              {t("feed.clearAll")}
            </Button>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Store className="size-6" />}
          title={t("feed.emptyTitle")}
          description={t("feed.emptyBody")}
          action={
            activeFilters > 0 ? (
              <Button variant="secondary" onPress={() => setFilters(emptyFilters())}>
                {t("feed.clearAll")}
              </Button>
            ) : null
          }
        />
      ) : sort === "newest" ? (
        <MasonryGrid columns={{ base: 2, md: 3, lg: 4, xl: 5 }}>
          {filtered.map((post) => (
            <MasonryItem key={post.post_id}>{renderCard(post)}</MasonryItem>
          ))}
        </MasonryGrid>
      ) : (
        /**
         * An explicit sort drops the masonry, by design. CSS multi-column fills
         * column-major (masonry-grid.tsx says so in its own header), so in
         * "price, low to high" the second-cheapest item is not beside the
         * cheapest — it is below it, and the item to its right is somewhere
         * around rank n/4. The order is correct in the array and unreadable on
         * screen. A plain grid is row-major, which is the only layout in which
         * a chosen sort means anything. `newest` keeps the masonry because it
         * is the default browse order, not an ordering anyone asked for.
         */
        <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map(renderCard)}
        </div>
      )}
    </div>
  );
}

function toggled<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Digits only: a price field that accepts "12e4" or "-3" has to defend itself. */
function parsePriceInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

function priceLabel(
  t: ReturnType<typeof useTranslations>,
  { minPrice, maxPrice }: FeedFilters,
) {
  if (minPrice !== null && maxPrice !== null) {
    return t("feed.priceBetween", { min: minPrice, max: maxPrice });
  }
  if (minPrice !== null) return t("feed.priceFrom", { min: minPrice });
  return t("feed.priceUpTo", { max: maxPrice ?? 0 });
}

/**
 * Shared by both layouts above so the card stays identical whichever grid it
 * lands in — only the wrapper differs.
 */
function renderCard(post: Post) {
  return (
    <PostCard
      key={post.post_id}
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
        user_id: post.seller.user_id,
        name: post.seller.name,
        isVerified: post.seller.isVerified,
        faculty: post.seller.faculty,
      }}
    />
  );
}

/**
 * The sort control. One component, two shapes: a 44px icon button on a phone,
 * where the search field needs every pixel it can get, and the same button with
 * the current sort spelled out from `sm` up. Collapsing it with `hidden sm:*`
 * rather than rendering two controls keeps one Select in the accessibility tree.
 *
 * Selecting applies immediately, like every filter on this screen.
 */
function SortSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: SortKey;
  onChange: (next: SortKey) => void;
  options: Array<{ id: SortKey; label: string }>;
}) {
  return (
    <Select
      aria-label={label}
      selectedKey={value}
      onSelectionChange={(key) => onChange(key as SortKey)}
      className="shrink-0"
    >
      <Button
        variant="secondary"
        size="icon"
        pill
        className="w-11 sm:w-auto sm:gap-1.5 sm:px-4"
      >
        <span className="relative">
          <ArrowUpDown aria-hidden className="size-5 sm:size-4" />
          {/*
            The phone shape has no room for the label, so a non-default sort
            would otherwise be silently active. Same affordance as the filter
            button's count badge, minus the number: there is only ever one sort.
          */}
          {value !== "newest" ? (
            <span
              aria-hidden
              className="absolute -top-1.5 -right-1.5 size-2 rounded-pill bg-brand sm:hidden"
            />
          ) : null}
        </span>
        <SelectValue className="hidden min-w-0 truncate text-body-sm sm:block">
          {({ selectedText }) => selectedText}
        </SelectValue>
        <ChevronDown aria-hidden className="hidden size-4 shrink-0 text-ink-muted sm:block" />
      </Button>

      <Popover
        placement="bottom end"
        className={cn(
          "z-[90] min-w-52 overflow-auto rounded-control bg-surface p-1 shadow-overlay",
          "data-[entering]:anim-pop-in",
          "data-[exiting]:anim-fade-out",
        )}
      >
        <ListBox className="outline-none">
          {options.map((option) => (
            <SelectOption key={option.id} id={option.id} textValue={option.label}>
              {option.label}
            </SelectOption>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}

/**
 * One active filter, with its own undo. The whole pill is the button rather
 * than a small x inside it: a 16px target inside a chip fails the 44px floor,
 * and there is nothing else the pill could usefully do when tapped.
 */
function ActiveFilterPill({
  label,
  removeLabel,
  onRemove,
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={removeLabel}
      onClick={onRemove}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-3.5",
        "bg-brand-subtle text-caption font-medium text-ink-brand",
        "transition-colors duration-[--dur-fast] hover:bg-[var(--brand-subtle-hover)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
      )}
    >
      <span className="max-w-40 truncate">{label}</span>
      <X aria-hidden className="size-3.5 shrink-0" />
    </button>
  );
}

function FilterScrollButton({
  direction,
  onPress,
}: {
  direction: "left" | "right";
  onPress: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  const label = direction === "left" ? "Show previous filters" : "Show more filters";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 flex w-14 items-center",
        direction === "left"
          ? "left-0 justify-start bg-gradient-to-r from-page via-page/95 to-transparent"
          : "right-0 justify-end bg-gradient-to-l from-page via-page/95 to-transparent",
      )}
    >
      <button
        type="button"
        aria-label={label}
        onClick={onPress}
        className="pointer-events-auto grid size-9 place-items-center rounded-pill border border-line bg-surface text-ink-secondary shadow-raised transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Icon aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/**
 * The dot used to carry the condition ramp. CLAUDE.md §3.9 confines rarity
 * colour to inventory and trade, and the feed is neither — a filter row is
 * chrome, and it was spending the screen's one saturated element on a legend.
 * The label already names the condition.
 *
 * The count is the second fix: an unfiltered chip used to be tappable straight
 * into an empty feed. A chip with no results left is disabled — unless it is
 * the one currently selected, which must always be removable.
 */
function FilterChip({
  isActive,
  count,
  onToggle,
  children,
}: {
  isActive: boolean;
  /** Results this chip would leave, given every other filter. */
  count: number;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const isDisabled = count === 0 && !isActive;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={isDisabled}
      onClick={onToggle}
      className={cn(
        // Same two fixes as history-list.tsx's filter chip: 44px, and
        // green-700 rather than green-600 under a 13px label.
        "flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-caption font-medium",
        "transition-colors duration-[--dur-fast]",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
        isActive
          ? "bg-brand-band text-on-brand-strong shadow-raised"
          : "bg-surface-sunken text-ink-secondary shadow-sunken enabled:hover:bg-gray-200",
      )}
    >
      {children}
      <span
        data-numeric
        className={cn(
          "text-meta tabular-nums",
          isActive ? "text-on-brand-strong/80" : "text-ink-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}
