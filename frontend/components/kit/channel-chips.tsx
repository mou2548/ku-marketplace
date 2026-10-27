import { Gift } from "lucide-react";

import { useStatusText } from "@/lib/status-text";
import { POST_TYPE } from "@/lib/status";
import type { ItemChannel } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { TONE_CHIP } from "./tone";

/**
 * One small pill per currently open channel on an item — the multi-value
 * sibling to `ListingTypeBadge` (one post) and `StatusBadge` (one status).
 * An item can carry a sale post, a trade post and a giveaway at once now, so
 * no single badge can represent its state any more.
 */
export function ChannelChips({
  channels,
  className,
}: {
  channels: ItemChannel[];
  className?: string;
}) {
  const st = useStatusText();

  if (channels.length === 0) return null;

  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {channels.map((channel) =>
        channel.type === "post" ? (
          <span
            key={`post-${channel.post_id}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold",
              channel.post_type === "SellOnly" &&
                "bg-[var(--listing-sale-bg)] text-[var(--listing-sale-fg)]",
              channel.post_type === "TradeOnly" &&
                "bg-[var(--listing-trade-bg)] text-[var(--listing-trade-fg)]",
              channel.post_type === "Both" &&
                "bg-[var(--listing-both-bg)] text-[var(--listing-both-fg)]",
            )}
          >
            {st.of(POST_TYPE[channel.post_type]).label}
            <span data-numeric>{channel.quantity_remaining}</span>
          </span>
        ) : (
          <span
            key={`giveaway-${channel.giveaway_id}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-chip border px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold",
              TONE_CHIP.trade,
            )}
          >
            <Gift aria-hidden className="size-3" />
            <span data-numeric>
              {channel.quantity_total - channel.quantity_claimed}
            </span>
          </span>
        ),
      )}
    </span>
  );
}
