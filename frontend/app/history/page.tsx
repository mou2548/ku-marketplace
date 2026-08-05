"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";

import { GiveawayRequestTabs } from "@/components/giveaway-request-tabs";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type TradeStatus = "pending" | "processing" | "completed" | "cancelled";

interface TradeHistoryEntry {
  id: string;
  status: TradeStatus;
  time: string;
  counterparty: string;
  yours: string;
  yoursImage: string;
  theirs: string;
  theirsImage: string;
}

const CALCULATOR_IMAGE =
  "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=400&auto=format&fit=crop";

// TODO: replace with the real transaction history from the API
const TRADE_HISTORY: TradeHistoryEntry[] = [
  {
    id: "trade-1",
    status: "pending",
    time: "Sent 2 hours ago",
    counterparty: "Nong Ploy",
    yours: "Calculus 1 Textbook",
    yoursImage: "/images/product-physics-textbooks.png",
    theirs: "Scientific Calculator",
    theirsImage: CALCULATOR_IMAGE,
  },
  {
    id: "trade-2",
    status: "processing",
    time: "Sent 1 day ago",
    counterparty: "Kritsada P.",
    yours: "Lab Coat (Size M)",
    yoursImage:
      "https://upload.wikimedia.org/wikipedia/commons/d/d8/Lab_coat_and_scrubs.jpg",
    theirs: "Drafting Tools Set",
    theirsImage:
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "trade-3",
    status: "completed",
    time: "Completed 3 days ago",
    counterparty: "Nutthapong T.",
    yours: "Physics Textbook",
    yoursImage: "/images/product-physics-textbooks.png",
    theirs: "Casio FX-991EX",
    theirsImage: CALCULATOR_IMAGE,
  },
  {
    id: "trade-4",
    status: "cancelled",
    time: "Cancelled 5 days ago",
    counterparty: "Chaya R.",
    yours: "KU Engineering Uniform",
    yoursImage: "/images/product-uniform.png",
    theirs: "Sony WH-1000XM4",
    theirsImage: "/images/product-sony-headphones.png",
  },
];

const STATUS_META: Record<
  TradeStatus,
  { label: string; icon: typeof Clock; className: string; accent: string }
> = {
  pending: {
    label: "Pending Handover",
    icon: Clock,
    className: "bg-warning-bg text-warning",
    accent: "bg-warning",
  },
  processing: {
    label: "Processing",
    icon: RefreshCw,
    className: "bg-teal-light text-teal-dark",
    accent: "bg-teal",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-primary-light text-primary-dark",
    accent: "bg-primary-dark",
  },
  cancelled: {
    label: "Cancelled",
    icon: X,
    className: "bg-error-bg text-error",
    accent: "bg-error",
  },
};

function Thumb({ name, image }: { name: string; image: string }) {
  return (
    <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border/30 bg-white">
      <Image src={image} alt={name} fill className="object-cover" />
    </div>
  );
}

function TradeHistoryCard({ trade }: { trade: TradeHistoryEntry }) {
  const meta = STATUS_META[trade.status];
  const dimmed = trade.status === "cancelled";

  return (
    <Card
      className={cn(
        "flex-row items-stretch gap-0 rounded-3xl p-0 shadow-elevated ring-0",
        dimmed && "opacity-70"
      )}
    >
      {/* status accent rail, like the reference list rows */}
      <div className={cn("w-1.5 shrink-0", meta.accent)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <div className="flex shrink-0 items-center gap-2">
            <Thumb name={trade.yours} image={trade.yoursImage} />
            <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground/60" />
            <Thumb name={trade.theirs} image={trade.theirsImage} />
          </div>

          {/* badge drops under the title on narrow screens — inline it would
              squeeze the item names down to a few characters */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="truncate text-lg font-semibold text-foreground">
                {trade.yours} <span className="text-muted-foreground">for</span>{" "}
                {trade.theirs}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                Trade #{trade.id} • {trade.time}
              </p>
            </div>

            <Badge
              className={cn(
                "h-auto w-fit shrink-0 gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap",
                meta.className
              )}
            >
              <meta.icon className="size-3.5" />
              {meta.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/20 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {trade.counterparty.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-muted-foreground">
              With: {trade.counterparty}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {trade.status === "completed" ? (
              <>
                <Link
                  href={`/disputes?trade=${trade.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 border-error px-5 text-sm whitespace-nowrap text-error hover:bg-error/5"
                  )}
                >
                  Report Issue
                </Link>
                <Link
                  href="/chat"
                  className={cn(
                    buttonVariants(),
                    "h-11 gap-2 bg-teal-dark px-5 text-sm whitespace-nowrap hover:bg-teal-dark/90"
                  )}
                >
                  <Eye className="size-4" />
                  Go to chat
                </Link>
              </>
            ) : trade.status !== "cancelled" ? (
              <Link
                href={`/trade/${trade.id}/cancel`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 border-error px-5 text-sm whitespace-nowrap text-error hover:bg-error/5"
                )}
              >
                Cancel Offer
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState("trades");

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 py-8">
        <PageHeader
          title="History"
          subtitle="All your marketplace trades and giveaway requests in one place."
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto! w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-sm">
            <TabsTrigger
              value="trades"
              className="h-10! flex-none rounded-full px-4 text-sm whitespace-nowrap text-foreground/70 data-active:bg-surface-muted data-active:text-foreground data-active:shadow-none"
            >
              Marketplace Trades
            </TabsTrigger>
            <TabsTrigger
              value="giveaways"
              className="h-10! flex-none rounded-full px-4 text-sm whitespace-nowrap text-foreground/70 data-active:bg-surface-muted data-active:text-foreground data-active:shadow-none"
            >
              Giveaway Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="pt-6">
            {/* capped width: a full 1200px row leaves the two item boxes stretched and empty */}
            <div className="flex max-w-5xl flex-col gap-6">
              {TRADE_HISTORY.map((trade) => (
                <TradeHistoryCard key={trade.id} trade={trade} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="giveaways" className="pt-6">
            <GiveawayRequestTabs />
          </TabsContent>
        </Tabs>
      </main>

      <SiteFooter />
    </div>
  );
}
