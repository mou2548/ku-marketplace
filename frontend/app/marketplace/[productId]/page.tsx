import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Repeat,
} from "lucide-react";

import { BuyNowActions } from "@/components/buy-now-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProduct } from "@/lib/marketplace-products";
import { cn } from "@/lib/utils";

const CONDITION_CLASS: Record<string, string> = {
  "LIKE NEW": "bg-primary-light text-primary-dark",
  EXCELLENT: "bg-primary-light text-primary-dark",
  FAIR: "bg-warning/15 text-warning",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = getProduct(productId);
  if (!product) notFound();

  const canBuy = product.mode === "buy" || product.mode === "both";
  const canSwap = product.mode === "swap" || product.mode === "both";

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <nav className="flex items-center gap-2 pb-4 text-base text-muted-foreground">
          <Link href="/marketplace" className="hover:text-foreground">
            Marketplace
          </Link>
          <ChevronRight className="size-3" />
          <Link href="/marketplace" className="hover:text-foreground">
            {product.category}
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <Card className="flex-col gap-4 rounded-3xl p-6 shadow-elevated ring-0">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              </div>
            </Card>

            <Card className="flex-row items-center justify-between rounded-3xl p-6 shadow-elevated ring-0">
              <div className="flex items-center gap-4">
                <Avatar className="size-12">
                  <AvatarImage src={product.sellerAvatar} alt={product.sellerName} />
                  <AvatarFallback>{product.sellerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold tracking-[0.14px] text-foreground">
                      {product.sellerName}
                    </span>
                    {product.sellerBadge !== "none" && (
                      <BadgeCheck className="size-[15px] text-primary-dark" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Member of KU Marketplace
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl bg-surface-muted px-4 py-2">
                <div className="flex flex-col items-center border-r border-border/30 pr-4">
                  <span className="text-xl font-bold text-primary-dark">
                    {product.sellerRating}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Rating</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold text-foreground">
                    {product.sellerSalesCount}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Sales</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="flex-col gap-6 rounded-3xl p-6 shadow-elevated ring-0">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-semibold text-foreground">
                    {product.title}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Save"
                    className="text-muted-foreground"
                  >
                    <Bookmark className="size-5" />
                  </Button>
                </div>

                {product.mode !== "swap" && (
                  <p className="text-5xl font-bold tracking-[-0.96px] text-primary">
                    ฿{(product.price ?? 0).toLocaleString("en-US")}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={cn(
                      "h-auto px-2 py-1 text-xs",
                      CONDITION_CLASS[product.condition] ??
                        "bg-muted text-foreground"
                    )}
                  >
                    {product.condition}
                  </Badge>
                  <Badge className="h-auto border-border/30 bg-surface-muted px-2 py-1 text-xs text-foreground">
                    {product.category}
                  </Badge>
                </div>
              </div>

              <div className="h-px w-full bg-border/30" />

              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium tracking-[0.14px] text-foreground">
                  Item Specifics
                </h3>
                <ul className="flex flex-col">
                  {product.specs.map((spec) => (
                    <li
                      key={spec.label}
                      className="flex items-center justify-between border-b border-border/20 py-2"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {spec.label}
                      </span>
                      <span className="text-base text-foreground">{spec.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium tracking-[0.14px] text-foreground">
                  Seller Notes
                </h3>
                <p className="text-base leading-6 text-muted-foreground">
                  {product.sellerNotes}
                </p>
              </div>

              <div className="flex flex-col gap-4 pt-2">
                {/* §3.1.1/§3.1.3 — the buy button only exists on posts whose
                    mode offers a price. §3.5 handles what happens on press. */}
                {canBuy && (
                  <BuyNowActions
                    productId={product.id}
                    price={product.price ?? 0}
                  />
                )}
                {canSwap && (
                  <Link
                    href={`/trade/${product.id}`}
                    className="flex h-12 items-center justify-center gap-2 rounded-full bg-teal-dark text-sm font-medium text-white hover:bg-teal-dark/90"
                  >
                    <Repeat className="size-4" />
                    Propose to swap
                  </Link>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
