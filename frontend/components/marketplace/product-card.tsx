"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, BadgeCheck, Heart, Repeat, Star, Zap } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  Product,
  ProductCondition,
  SellerBadge,
} from "@/lib/marketplace-products";

export type { Product, ProductCondition, SellerBadge };

const BADGE_ICON: Record<Exclude<SellerBadge, "none">, typeof BadgeCheck> = {
  verified: BadgeCheck,
  "top-seller": Star,
  "swap-champion": Repeat,
};

const BADGE_COLOR_CLASS: Record<Exclude<SellerBadge, "none">, string> = {
  verified: "text-teal-dark",
  "top-seller": "text-warning",
  "swap-champion": "text-teal",
};

const CONDITION_CLASS: Record<ProductCondition, string> = {
  "LIKE NEW": "bg-primary-light text-primary-dark",
  EXCELLENT: "bg-primary-light text-primary-dark",
  FAIR: "bg-warning-bg text-warning",
};

function formatPrice(price: number) {
  return `฿${price.toLocaleString("en-US")}`;
}

export function ProductCard({ product }: { product: Product }) {
  const [liked, setLiked] = useState(product.liked ?? false);
  const BadgeIcon = product.sellerBadge !== "none" ? BADGE_ICON[product.sellerBadge] : null;
  const conditionClass = CONDITION_CLASS[product.condition];
  const canBuy = product.mode === "buy" || product.mode === "both";
  const canSwap = product.mode === "swap" || product.mode === "both";

  return (
    // h-full + mt-auto on the CTA row keeps every card's buttons on the same
    // baseline no matter how tall the title / "Swap available" block is.
    <div className="flex h-full flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {/* inset-0 is load-bearing: without it the <a> collapses to 0x0 (the
            fill Image is absolute) and the whole photo becomes unclickable. */}
        <Link
          href={`/marketplace/${product.id}`}
          aria-label={product.title}
          className="absolute inset-0"
        >
          <Image src={product.image} alt={product.title} fill className="object-cover" />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setLiked((value) => !value)}
          aria-label="Toggle wishlist"
          className="absolute top-2 right-2 z-10 size-8 rounded-full bg-white/90 shadow-sm hover:bg-white"
        >
          <Heart
            className={cn("size-4", liked ? "text-red-500" : "text-[#6F7A6F]")}
            fill={liked ? "currentColor" : "none"}
          />
        </Button>
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
          <BadgeIcon
            className={cn(
              "size-3.5",
              BADGE_COLOR_CLASS[product.sellerBadge as Exclude<SellerBadge, "none">]
            )}
          />
        )}
      </div>

      <Link href={`/marketplace/${product.id}`} className="text-sm font-semibold hover:underline">
        {product.title}
      </Link>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            conditionClass
          )}
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
        <span className="flex items-center gap-1 text-xs font-medium text-primary-dark">
          <Zap className="size-3.5" />
          Swap available
        </span>
      )}

      {/* Only the actions this listing actually supports are rendered — same rule as
          the product detail page. Labels never change with state. */}
      <div className="mt-auto flex gap-2 pt-1">
        {canBuy && (
          <Link
            href={`/marketplace/${product.id}`}
            className={cn(buttonVariants(), "h-9 flex-1 rounded-full bg-primary-dark")}
          >
            Buy Now
          </Link>
        )}
        {canSwap && (
          <Link
            href={`/trade/${product.id}`}
            className={cn(
              buttonVariants(),
              "h-9 flex-1 rounded-full bg-[#2D7791] hover:bg-[#2D7791]/90"
            )}
          >
            Propose Swap
          </Link>
        )}
      </div>
    </div>
  );
}
