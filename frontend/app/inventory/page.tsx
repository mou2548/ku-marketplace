"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FolderMinus,
  Lock,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { RemoveItemDialog } from "@/components/remove-item-dialog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ITEM_CONDITION_LABELS,
  ITEM_STATUS_LABELS,
  canDeleteItem,
  isItemLocked,
  myItems,
  type ItemStatus,
} from "@/lib/items";
import { getPostByItemId } from "@/lib/posts";
import { cn } from "@/lib/utils";

const TABS = [
  "All Items",
  "Unlisted",
  "Listed",
  "Transferred",
] as const;

/** Tab label → the §2.3 status it filters on. "All Items" filters nothing. */
const TAB_STATUS: Record<(typeof TABS)[number], ItemStatus | null> = {
  "All Items": null,
  Unlisted: "unlisted",
  Listed: "listed",
  Transferred: "transferred",
};

export default function InventoryPage() {
  const [selectedTab, setSelectedTab] = useState<(typeof TABS)[number]>("All Items");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState(myItems);

  // Only categories actually present — the full 10 from §2.2 would overflow
  // the filter row with chips that match nothing.
  const categories = [...new Set(items.map((item) => item.category))];

  const totalItemsCount = items.length;
  const listingItems = items.filter((item) => item.status === "listed").length;
  // TODO: replace with the real completed-swap count from the API
  const successfulSwapsCount = 12;

  function deleteItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  const filteredItems = items.filter((item) => {
    const tabStatus = TAB_STATUS[selectedTab];
    if (tabStatus !== null && item.status !== tabStatus) return false;
    if (selectedCategory !== "All" && item.category !== selectedCategory) return false;
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(query);
      const matchDesc = item.description?.toLowerCase().includes(query) ?? false;
      const wants = getPostByItemId(item.id)?.wants.join(" ").toLowerCase() ?? "";
      if (!matchName && !matchDesc && !wants.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 lg:gap-8 lg:py-12">
        <Card className="flex-col gap-6 rounded-3xl p-6 shadow-elevated ring-0 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <PageHeader title="Inventory" subtitle="Manage items for trade or market listings." />

          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-border px-5 py-3 text-center">
              <span className="text-xl font-semibold text-primary-dark lg:text-2xl">
                {totalItemsCount}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Total Items</span>
            </div>
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-border px-5 py-3 text-center">
              <span className="text-xl font-semibold text-primary-dark lg:text-2xl">
                {listingItems}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Active Listings
              </span>
            </div>
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-border px-5 py-3 text-center">
              <span className="text-xl font-semibold text-primary-dark lg:text-2xl">
                {successfulSwapsCount}
              </span>
              <span className="text-xs leading-tight font-medium whitespace-pre-line text-muted-foreground">
                Successful{"\n"}Swaps
              </span>
            </div>

            <Link
              href="/inventory/add"
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary-dark px-6 text-sm font-semibold text-white shadow-card transition-all hover:bg-primary-dark"
            >
              <Plus className="size-4" />
              Add Item
            </Link>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as (typeof TABS)[number])}>
            <TabsList className="h-auto! w-full justify-start gap-2 overflow-x-auto border-b border-border/30 bg-transparent p-0">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="h-auto! flex-none rounded-xl px-5 py-2.5 text-sm whitespace-nowrap text-muted-foreground data-active:bg-primary-dark data-active:text-white data-active:shadow-none hover:text-foreground"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative h-12 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-full rounded-xl border-border bg-surface-muted pl-12"
              />
            </div>

            <Tabs
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <TabsList className="h-auto! w-full max-w-full gap-2 overflow-x-auto bg-transparent p-0">
                <TabsTrigger
                  value="All"
                  className="h-10! shrink-0 gap-1.5 rounded-full border border-border px-4 text-xs whitespace-nowrap text-muted-foreground data-active:border-primary-dark data-active:bg-primary-dark data-active:text-white data-active:shadow-none"
                >
                  <SlidersHorizontal className="size-3.5" />
                  Categories
                </TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="h-10! flex-none rounded-full border border-border px-5 text-xs whitespace-nowrap text-muted-foreground data-active:border-primary-dark data-active:bg-primary-dark data-active:text-white data-active:shadow-none"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/inventory/add"
            className="group flex min-h-[314px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border p-6 text-center transition-all duration-500 hover:border-primary hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 transition-transform duration-500 group-hover:scale-110">
              <Plus className="size-7 text-primary" />
            </div>
            <h3 className="mb-1 text-xl font-semibold text-primary-dark">Upload Item</h3>
            <p className="max-w-[180px] text-xs leading-relaxed font-medium text-muted-foreground">
              Add new items to your locker for trading
            </p>
          </Link>

          {filteredItems.map((item) => {
            const post = getPostByItemId(item.id);
            const locked = isItemLocked(item);

            return (
            <Card
              key={item.id}
              className="group relative flex-col gap-0 overflow-hidden rounded-3xl p-0 ring-0 transition-all duration-500 hover:shadow-xl hover:shadow-primary-dark/5"
            >
              <div className="relative h-44 w-full overflow-hidden bg-surface-muted">
                <Image
                  src={item.images[0]}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <Badge className="absolute top-4 right-4 z-10 h-auto gap-1 bg-primary-dark/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  <Tag className="size-3" />
                  {ITEM_STATUS_LABELS[item.status].en}
                </Badge>
                {/* §2.3 — the lock comes from having a live trade, not from the
                    status, so it is a separate badge on purpose. */}
                {locked && (
                  <Badge className="absolute top-4 left-4 z-10 h-auto gap-1 bg-warning-dark/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <Lock className="size-3" />
                    In trade
                  </Badge>
                )}
                <Badge className="absolute bottom-3 left-4 z-10 h-auto gap-0 bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-md">
                  {ITEM_CONDITION_LABELS[item.condition].en}
                </Badge>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-3 p-5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold tracking-wider text-primary-dark uppercase">
                    {item.category}
                  </span>
                  <h3 className="line-clamp-1 text-lg font-medium text-primary-dark transition-colors group-hover:text-primary">
                    {item.name}
                  </h3>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-border/20 pt-2">
                  {/* §2.1 — price and wants belong to the post, never the item */}
                  {post && post.wants.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="font-bold text-primary-dark">Looking for:</span>
                      <span className="max-w-[140px] truncate font-medium">
                        {post.wants.join(", ")}
                      </span>
                    </div>
                  )}
                  {post?.price !== undefined && (
                    <div className="flex items-baseline gap-0.5 text-sm font-semibold text-primary-dark">
                      <span className="text-xs font-normal">Listed at:</span>
                      <span className="text-base font-bold">
                        ฿{post.price.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute inset-0 z-20 flex flex-col justify-between bg-white/95 p-5 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-primary-dark">{item.category}</span>
                  <h4 className="text-lg font-semibold text-primary-dark">{item.name}</h4>
                  <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    <p>
                      <strong className="text-primary-dark">Condition:</strong>{" "}
                      {ITEM_CONDITION_LABELS[item.condition].th}
                    </p>
                    <p>
                      <strong className="text-primary-dark">Status:</strong>{" "}
                      {ITEM_STATUS_LABELS[item.status].th}
                    </p>
                    {post && post.wants.length > 0 && (
                      <p>
                        <strong className="text-primary-dark">Looking for:</strong>{" "}
                        {post.wants.join(", ")}
                      </p>
                    )}
                    {post?.price !== undefined && (
                      <p>
                        <strong className="text-primary-dark">Listed at:</strong> ฿
                        {post.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {/* §2.3 — a locked item cannot be deleted while its trade
                      runs; §2.3.3 keeps transferred items as a permanent record */}
                  {canDeleteItem(item) ? (
                    <RemoveItemDialog
                      itemName={item.name}
                      onConfirm={() => deleteItem(item.id)}
                      triggerClassName={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-10 w-full rounded-full border-border text-xs font-semibold text-muted-foreground hover:border-primary-dark hover:text-primary-dark"
                      )}
                    >
                      Remove Item
                    </RemoveItemDialog>
                  ) : (
                    <p className="rounded-full bg-surface-muted px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">
                      {locked
                        ? "กำลังอยู่ในธุรกรรม ลบไม่ได้"
                        : "โอนเจ้าของแล้ว ลบไม่ได้"}
                    </p>
                  )}
                </div>
              </div>
            </Card>
            );
          })}

          {filteredItems.length === 0 && (
            <Card className="col-span-full flex-col items-center justify-center gap-1 rounded-3xl p-8 py-16 text-center ring-0">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <FolderMinus className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">No items found</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                We couldn&apos;t find any items matching your filters. Try shifting tabs or
                clear your search query.
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedTab("All Items");
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="mt-4 bg-primary-dark/10 text-xs font-semibold text-primary-dark hover:bg-primary-dark hover:text-white"
              >
                Clear Filters
              </Button>
            </Card>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
