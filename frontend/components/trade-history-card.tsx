import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getItem } from "@/lib/items";
import {
  DISPUTE_STATUS_LABELS,
  TRADE_STATUS_LABELS,
  canCancelUnilaterally,
  isTradeLive,
  nextActionFor,
  type Trade,
  type TradeStatus,
} from "@/lib/trades";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  TradeStatus,
  { icon: typeof Clock; className: string; accent: string }
> = {
  pending: {
    icon: Clock,
    className: "bg-warning-bg text-warning",
    accent: "bg-warning",
  },
  processing: {
    icon: RefreshCw,
    className: "bg-teal-light text-teal-dark",
    accent: "bg-teal",
  },
  completed: {
    icon: CheckCircle2,
    className: "bg-primary-light text-primary-dark",
    accent: "bg-primary-dark",
  },
  cancelled: {
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

/** Which item is "mine" depends on the side I'm on in this trade (§2.4). */
function sidesOf(trade: Trade) {
  const postItem = getItem(trade.postItemId);
  const offered = trade.offeredItemIds.map(getItem).filter(Boolean);
  const mine = trade.myRole === "seller" ? postItem : offered[0];
  const theirs = trade.myRole === "seller" ? offered[0] : postItem;
  return { mine, theirs, offeredCount: offered.length };
}

export function TradeHistoryCard({ trade }: { trade: Trade }) {
  const meta = STATUS_META[trade.status];
  const { mine, theirs, offeredCount } = sidesOf(trade);
  const nextAction = nextActionFor(trade);
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
            {mine && <Thumb name={mine.name} image={mine.images[0]} />}
            <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground/60" />
            {theirs && <Thumb name={theirs.name} image={theirs.images[0]} />}
          </div>

          {/* badge drops under the title on narrow screens — inline it would
              squeeze the item names down to a few characters */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="truncate text-lg font-semibold text-foreground">
                {mine?.name} <span className="text-muted-foreground">for</span>{" "}
                {theirs?.name}
                {offeredCount > 1 && (
                  <span className="text-muted-foreground">
                    {" "}
                    +{offeredCount - 1}
                  </span>
                )}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                Trade #{trade.id} • {TRADE_STATUS_LABELS[trade.status].th}
              </p>
            </div>

            <div className="flex w-fit shrink-0 flex-wrap gap-2">
              <Badge
                className={cn(
                  "h-auto gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap",
                  meta.className
                )}
              >
                <meta.icon className="size-3.5" />
                {TRADE_STATUS_LABELS[trade.status].en}
              </Badge>

              {/* §2.5 — dispute rides alongside the status, never replaces it.
                  A completed trade under review shows both badges at once. */}
              {trade.dispute !== "none" && (
                <Badge className="h-auto gap-1.5 bg-error-bg px-3 py-1.5 text-sm whitespace-nowrap text-error">
                  <AlertTriangle className="size-3.5" />
                  {DISPUTE_STATUS_LABELS[trade.dispute].en}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/20 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {trade.counterpartyName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-muted-foreground">
              With: {trade.counterpartyName}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* §2.5 — reporting stays open after Completed, so this is keyed on
                "not cancelled", not on "still live". */}
            {trade.status !== "cancelled" && trade.dispute === "none" && (
              <Link
                href={`/disputes?trade=${trade.id}`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 border-error px-5 text-sm whitespace-nowrap text-error hover:bg-error/5"
                )}
              >
                Report Issue
              </Link>
            )}

            {/* §2.4.1 vs §4.7 — a pending trade cancels outright, a processing
                one can only ask the other side. Different destinations. */}
            {isTradeLive(trade) && (
              <Link
                href={
                  canCancelUnilaterally(trade)
                    ? `/trade/${trade.id}/cancel`
                    : `/trade/${trade.id}/cancel/request`
                }
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 px-5 text-sm whitespace-nowrap"
                )}
              >
                Cancel
              </Link>
            )}

            {/* The §4 step this user owns right now, if any. Null means the
                other side has to move first — no button invented for it. */}
            {nextAction ? (
              <Link
                href={nextAction.href}
                className={cn(
                  buttonVariants(),
                  "h-11 gap-2 bg-primary-dark px-5 text-sm whitespace-nowrap"
                )}
              >
                {nextAction.label}
              </Link>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
