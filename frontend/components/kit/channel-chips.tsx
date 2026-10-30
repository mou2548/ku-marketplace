import { Gift } from "lucide-react";

import { useStatusText } from "@/lib/status-text";
import { POST_TYPE } from "@/lib/status";
import type { ItemChannel } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { StatusIcon } from "./icon";
import { BADGE_PAINT, BADGE_SHAPE } from "./tone";

/**
 * One small pill per currently open channel on an item — the multi-value
 * sibling to `ListingTypeBadge` (one post) and `StatusBadge` (one status).
 * An item can carry a sale post, a trade post and a giveaway at once now, so
 * no single badge can represent its state any more.
 *
 * Channels are categories: information tier, neutral, told apart by icon
 * and label (trade has no colour).
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
            className={cn(BADGE_SHAPE, BADGE_PAINT.neutral)}
          >
            <StatusIcon
              name={POST_TYPE[channel.post_type].icon}
              className="size-3.5 shrink-0"
            />
            {st.of(POST_TYPE[channel.post_type]).label}
            <span data-numeric>{channel.quantity_remaining}</span>
          </span>
        ) : (
          <span
            key={`giveaway-${channel.giveaway_id}`}
            className={cn(BADGE_SHAPE, BADGE_PAINT.neutral)}
          >
            <Gift aria-hidden className="size-3.5 shrink-0" />
            <span data-numeric>
              {channel.quantity_total - channel.quantity_claimed}
            </span>
          </span>
        ),
      )}
    </span>
  );
}
