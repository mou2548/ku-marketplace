"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { ProductCard, type Product } from "@/components/marketplace/product-card";

const TYPE_FILTERS = ["All", "Sell", "Swap", "Sell/Swap"];
const CATEGORY_FILTERS = [
  "All",
  "Books & Textbooks",
  "Stationery & Supplies",
  "Electronics",
  "Clothing & Fashion",
  "Dorm Essentials",
];

const BASE_PRODUCTS: Product[] = [
  {
    id: "sony-headphones",
    image: "/images/product-sony-headphones.png",
    title: "Sony WH-1000XM4",
    sellerName: "Nattawut S.",
    sellerAvatar: "/images/seller-avatar-1.png",
    sellerBadge: "verified",
    condition: "LIKE NEW",
    price: 7200,
    mode: "buy",
    liked: true,
  },
  {
    id: "physics-bundle",
    image: "/images/product-physics-textbooks.png",
    title: "Physics Bundle",
    sellerName: "Pitchaya K.",
    sellerAvatar: "/images/seller-avatar-2.png",
    sellerBadge: "top-seller",
    condition: "FAIR",
    mode: "swap",
  },
  {
    id: "ipad-pro",
    image: "/images/product-ipad-pro.png",
    title: "iPad Pro 11-inch",
    sellerName: "Sarah J.",
    sellerAvatar: "/images/seller-avatar-3.png",
    sellerBadge: "swap-champion",
    condition: "EXCELLENT",
    price: 15900,
    mode: "both",
  },
  {
    id: "ku-uniform",
    image: "/images/product-uniform.png",
    title: "KU Engineering Uniform (Size L)",
    sellerName: "Chaya R.",
    sellerAvatar: "/images/seller-avatar-4.png",
    sellerBadge: "none",
    condition: "LIKE NEW",
    price: 350,
    mode: "both",
  },
];

const PRODUCTS: Product[] = [
  ...BASE_PRODUCTS,
  ...BASE_PRODUCTS.map((product) => ({ ...product, id: `${product.id}-2` })),
];

export default function MarketplacePage() {
  const [activeType, setActiveType] = useState(TYPE_FILTERS[0]);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_FILTERS[0]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(141.42% 141.42% at 0% 0%, #F0FDF4 0%, rgba(240,253,244,0) 50%), radial-gradient(141.42% 141.42% at 100% 0%, #FFF 0%, rgba(255,255,255,0) 50%), linear-gradient(0deg, #F4F6F8 0%, #F4F6F8 100%), #FFF",
      }}
    >
      <SiteHeader />

      <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-8 pb-16">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            style={{ color: "#6F7A6F" }}
          />
          <Input
            placeholder="find something . . ."
            className="h-11 rounded-full border-none bg-white pl-9 shadow-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
            {TYPE_FILTERS.map((type) => (
              <Button
                key={type}
                variant="ghost"
                className="h-8 rounded-full px-4"
                style={
                  activeType === type
                    ? { backgroundColor: "#F1F5F9", color: "#191C1E" }
                    : undefined
                }
                onClick={() => setActiveType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">156 Items</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((category) => {
            const active = activeCategory === category;
            return (
              <Button
                key={category}
                variant={active ? "default" : "outline"}
                className="h-9 rounded-full"
                style={active ? { backgroundColor: "#1D6D41" } : undefined}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  );
}
