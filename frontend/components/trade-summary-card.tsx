import Image from "next/image";
import { ArrowLeftRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ITEM_CONDITION_LABELS, getItem } from "@/lib/items";
import { TRADE_STATUS_LABELS, tradeAmount, type Trade } from "@/lib/trades";

/**
 * The "what am I looking at" header shared by every §4 fulfilment screen.
 * Server-only: nothing here is interactive.
 */
export function TradeSummaryCard({ trade }: { trade: Trade }) {
  const postItem = getItem(trade.postItemId);
  const offered = trade.offeredItemIds.map(getItem).filter((item) => item !== undefined);
  const amount = tradeAmount(trade);

  return (
    <Card className="w-full flex-col gap-4 rounded-3xl p-6 shadow-card ring-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Trade #{trade.id}
        </span>
        <Badge className="h-auto bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {TRADE_STATUS_LABELS[trade.status].th}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {postItem && (
          <div className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/30 bg-surface-muted">
              <Image
                src={postItem.images[0]}
                alt={postItem.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {postItem.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {ITEM_CONDITION_LABELS[postItem.condition].th}
              </span>
            </div>
          </div>
        )}

        {offered.length > 0 && (
          <>
            <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground/60" />
            <div className="flex flex-wrap gap-2">
              {offered.map((item) => (
                <Badge
                  key={item.id}
                  variant="outline"
                  className="h-auto px-3 py-1 text-xs text-foreground"
                >
                  {item.name}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/20 pt-4">
        <span className="text-sm text-muted-foreground">
          {trade.myRole === "buyer" ? "ผู้ขาย" : "ผู้ซื้อ"}: {trade.counterpartyName}
        </span>
        {amount > 0 && (
          <span className="text-lg font-bold text-primary-dark">
            ฿{amount.toLocaleString()}
          </span>
        )}
      </div>
    </Card>
  );
}
