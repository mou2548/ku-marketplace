"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftRight,
  BadgeCheck,
  BookOpen,
  Check,
  MessageCircle,
  PanelRight,
  Send,
  ShieldCheck,
} from "lucide-react";

import { ItemDetailHero } from "@/components/item-detail-hero";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// TODO: replace with the real target item + owner + trade-preference data from the API
const TARGET_ITEM = {
  title: "Calculus 1: Early Transcendentals (8th Edition)",
  postedNote: "Textbook • posted 2 days ago",
  owner: { name: "Nong Ploy", rating: 4.9 },
  condition: "Like New",
  tags: ["Engineering", "Textbook", "1st Year Course"],
  description:
    "Used this for Dr. Panya's Cal 1 class last semester. Kept in pristine condition inside a protective sleeve. No pages folded, completely free of any pen or highlight marks. Essential text for first-year engineering students. Open to swapping for specific items below or equivalent value.",
  wants: ["Scientific Calculator", "Lab Equipment", "Other Textbooks"],
};

// TODO: replace with the real signed-in user's inventory from the API
const INITIAL_INVENTORY = [
  {
    title: "Lab Coat (Size M)",
    note: "Excellent condition, washed",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Lab_coat_and_scrubs.jpg",
    selected: true,
  },
  {
    title: "Scientific Calculator",
    note: "Casio FX-991EX",
    image:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=400&auto=format&fit=crop",
    selected: true,
  },
  {
    title: "Drafting Tools Set",
    note: "Missing one ruler",
    image:
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=400&auto=format&fit=crop",
    selected: false,
  },
];

export default function OfferTradePage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = use(params);
  const [items, setItems] = useState(INITIAL_INVENTORY);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleItem = (index: number) =>
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );

  const selectedCount = items.filter((item) => item.selected).length;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <div className="flex items-center justify-between border-b border-border/20 bg-white/80 px-6 py-3 backdrop-blur-md">
        <h1 className="text-xl font-semibold text-foreground">Offer trade</h1>
        <Button
          onClick={() => setDrawerOpen((open) => !open)}
          className="gap-2 text-sm font-medium"
        >
          <PanelRight className="size-4" />
          {drawerOpen ? "Hide items" : `Select items (${selectedCount})`}
        </Button>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <ItemDetailHero
          image="/images/product-physics-textbooks.png"
          alt={TARGET_ITEM.title}
          badges={[
            {
              icon: ShieldCheck,
              label: "Verified",
              className: "bg-white/90 text-primary-dark",
            },
            {
              icon: BadgeCheck,
              label: TARGET_ITEM.condition,
              className: "bg-[#FFBE3B]/90 text-[#6F4E00]",
            },
          ]}
        />

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {TARGET_ITEM.title}
          </h2>
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <BookOpen className="size-4" />
            <span>{TARGET_ITEM.postedNote}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="size-[60px] border-2 border-primary-light">
            <AvatarImage src="" alt={TARGET_ITEM.owner.name} />
            <AvatarFallback>{TARGET_ITEM.owner.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-1">
              <h3 className="text-xl font-semibold text-foreground">
                {TARGET_ITEM.owner.name}
              </h3>
              <BadgeCheck className="size-[18px] text-[#2E8F5A]" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Engineering Student • {TARGET_ITEM.owner.rating} Rating
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Message"
            className="bg-surface-muted text-primary-dark hover:bg-surface-muted/70"
          >
            <MessageCircle className="size-4" />
          </Button>
        </div>

        <Card className="flex-col gap-4 rounded-3xl p-6 shadow-card ring-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium tracking-[0.14px] text-muted-foreground">
              Condition
            </span>
            <Badge className="h-auto bg-primary-light px-2 py-0.5 text-sm text-primary-dark">
              {TARGET_ITEM.condition}
            </Badge>
          </div>
          <div className="h-px w-full bg-border/30" />
          <div className="flex flex-wrap gap-2">
            {TARGET_ITEM.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="h-auto px-3 py-1 text-xs text-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-semibold text-foreground">Description</h3>
          <p className="text-base leading-[26px] text-muted-foreground">
            {TARGET_ITEM.description}
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border-2 border-dashed border-border/50 bg-surface-muted p-6">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-5 text-[#7C5800]" />
            <h3 className="text-xl font-semibold text-foreground">
              Trade Preferences
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {TARGET_ITEM.wants.map((item) => (
              <Badge
                key={item}
                className="h-auto bg-white px-4 py-2 text-sm text-foreground shadow-card"
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </main>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full gap-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border/20 p-6">
            <SheetTitle className="text-xl">Select items to trade</SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-page-background/50 p-6">
            {items.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => toggleItem(index)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-3xl p-4 text-left transition-colors",
                  item.selected
                    ? "border-2 border-[#2E8F5A] bg-[#2E8F5A]/5"
                    : "border border-border/30 bg-white hover:bg-surface-muted"
                )}
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[#E5E7EB]">
                  <Image src={item.image} alt={item.title} fill className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <h4
                    className={cn(
                      "text-sm tracking-[0.14px] text-foreground",
                      item.selected ? "font-bold" : "font-medium"
                    )}
                  >
                    {item.title}
                  </h4>
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.note}
                  </span>
                </div>
                {item.selected ? (
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2E8F5A] shadow-card">
                    <Check className="size-3.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="size-6 shrink-0 rounded-full border-2 border-border/50" />
                )}
              </button>
            ))}
          </div>

          <SheetFooter className="gap-4 border-t border-border/20 p-6">
            <span className="px-2 text-base text-muted-foreground">
              {selectedCount} items selected
            </span>
            <Link
              href={`/offers/${tradeId}`}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#2E8F5A] text-lg font-semibold text-white shadow-card hover:bg-[#2E8F5A]/90"
            >
              Send Trade Offer
              <Send className="size-4" />
            </Link>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
