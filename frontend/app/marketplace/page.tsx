"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/marketplace/product-card";
import { PRODUCTS, PRODUCT_CATEGORIES } from "@/lib/marketplace-products";

const TYPE_FILTERS = ["All", "Sell", "Swap", "Sell/Swap"];
const CATEGORY_FILTERS = ["All", ...PRODUCT_CATEGORIES];

function matchesType(mode: (typeof PRODUCTS)[number]["mode"], type: string) {
  if (type === "All") return true;
  if (type === "Sell") return mode === "buy" || mode === "both";
  if (type === "Swap") return mode === "swap" || mode === "both";
  return mode === "both"; // Sell/Swap
}

export default function MarketplacePage() {
  const [activeType, setActiveType] = useState(TYPE_FILTERS[0]);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_FILTERS[0]);

  const filteredProducts = PRODUCTS.filter(
    (product) =>
      matchesType(product.mode, activeType) &&
      (activeCategory === "All" || product.category === activeCategory)
  );

  return (
    <div className="min-h-screen bg-page-background bg-[radial-gradient(141.42%_141.42%_at_0%_0%,#F0FDF4_0%,rgba(240,253,244,0)_50%),radial-gradient(141.42%_141.42%_at_100%_0%,#FFF_0%,rgba(255,255,255,0)_50%)]">
      <SiteHeader />

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-8 pt-8 pb-16">
        <PageHeader title="Marketplace" subtitle="Buy, sell, and swap with the KU community." />

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6F7A6F]" />
          <Input
            placeholder="find something . . ."
            className="h-11 rounded-full border-none bg-white pl-9 shadow-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <Tabs value={activeType} onValueChange={(value) => setActiveType(value as string)}>
            <TabsList className="h-auto! w-fit gap-1 rounded-full bg-white p-1 shadow-sm">
              {TYPE_FILTERS.map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="h-8! rounded-full px-4 text-sm text-foreground/70 data-active:bg-surface-muted data-active:text-foreground data-active:shadow-none"
                >
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <span className="text-sm text-muted-foreground">
            {filteredProducts.length} Items
          </span>
        </div>

        <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as string)}>
          <TabsList className="h-auto! w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
            {CATEGORY_FILTERS.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="h-9! flex-none rounded-full border border-border bg-transparent px-4 text-sm whitespace-nowrap text-foreground data-active:border-primary-dark data-active:bg-primary-dark data-active:text-white data-active:shadow-none"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">
            No items match these filters.
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
