"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeftRight, BadgeCheck, Heart, Repeat, Star, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export type SellerBadge = "verified" | "top-seller" | "swap-champion" | "none";
export type ProductCondition = "LIKE NEW" | "EXCELLENT" | "FAIR";
export type ProductMode = "buy" | "swap" | "both";

export interface Product {
  id: string;
  image: string;
  title: string;
  sellerName: string;
  sellerAvatar: string;
  sellerBadge: SellerBadge;
  condition: ProductCondition;
  price?: number;
  mode: ProductMode;
  liked?: boolean;
}

const BADGE_ICON: Record<Exclude<SellerBadge, "none">, typeof BadgeCheck> = {
  verified: BadgeCheck,
  "top-seller": Star,
  "swap-champion": Repeat,
};

const BADGE_COLOR: Record<Exclude<SellerBadge, "none">, string> = {
  verified: "#2D7791",
  "top-seller": "#D99E30",
  "swap-champion": "#2C7E93",
};

const CONDITION_STYLE: Record<ProductCondition, { bg: string; text: string }> = {
  "LIKE NEW": { bg: "#DCEFE3", text: "#1D6D41" },
  EXCELLENT: { bg: "#DCEFE3", text: "#1D6D41" },
  FAIR: { bg: "#D99E3026", text: "#D99E30" },
};

function formatPrice(price: number) {
  return `฿${price.toLocaleString("en-US")}`;
}

export function ProductCard({ product }: { product: Product }) {
  const [liked, setLiked] = useState(product.liked ?? false);
  const BadgeIcon = product.sellerBadge !== "none" ? BADGE_ICON[product.sellerBadge] : null;
  const condition = CONDITION_STYLE[product.condition];
  const canBuy = product.mode === "buy" || product.mode === "both";
  const canSwap = product.mode === "swap" || product.mode === "both";

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <Image src={product.image} alt={product.title} fill className="object-cover" />
        <button
          type="button"
          onClick={() => setLiked((value) => !value)}
          aria-label="Toggle wishlist"
          className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
        >
          <Heart
            className="size-4"
            fill={liked ? "#ef4444" : "none"}
            style={{ color: liked ? "#ef4444" : "#6F7A6F" }}
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Image
          src={product.sellerAvatar}
          alt={product.sellerName}
          width={20}
          height={20}
          className="rounded-full"
        />
        <span className="text-xs text-muted-foreground">{product.sellerName}</span>
        {BadgeIcon && (
          <BadgeIcon className="size-3.5" style={{ color: BADGE_COLOR[product.sellerBadge as Exclude<SellerBadge, "none">] }} />
        )}
      </div>

      <h3 className="text-sm font-semibold">{product.title}</h3>

      <div className="flex items-center justify-between">
        <span
          className="rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: condition.bg, color: condition.text }}
        >
          {product.condition}
        </span>
        {product.mode === "swap" ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeftRight className="size-3.5" />
            Swap Only
          </span>
        ) : (
          <span className="text-sm font-semibold">{formatPrice(product.price ?? 0)}</span>
        )}
      </div>

      {product.mode === "both" && (
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#1D6D41" }}>
          <Zap className="size-3.5" />
          Swap available
        </span>
      )}

      <div className="flex gap-2">
        <Button
          className="h-9 flex-1 rounded-lg"
          disabled={!canBuy}
          style={canBuy ? { backgroundColor: "#1D6D41" } : { backgroundColor: "#DAE2FD", color: "#6F7A6F" }}
        >
          {product.mode === "swap" ? "Buy" : "Buy Now"}
        </Button>
        <Button
          className="h-9 flex-1 rounded-lg"
          disabled={!canSwap}
          style={canSwap ? { backgroundColor: "#131B2E" } : { backgroundColor: "#DAE2FD", color: "#6F7A6F" }}
        >
          {canSwap ? "Propose Swap" : "Swap"}
        </Button>
      </div>
    </div>
  );
}
