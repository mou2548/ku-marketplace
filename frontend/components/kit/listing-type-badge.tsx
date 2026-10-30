import { useStatusText } from "@/lib/status-text";
import { POST_TYPE, type PostType } from "@/lib/status";
import { cn } from "@/lib/utils";

import { StatusIcon } from "./icon";
import { BADGE_PAINT, BADGE_SHAPE } from "./tone";

/**
 * A listing type is a category, not a state, so it is always information
 * tier: a soft neutral chip. Sale, trade and both are told apart by icon and
 * label, never by hue (trade has no colour).
 */
export function ListingTypeBadge({
  type,
  className,
}: {
  type: PostType;
  className?: string;
}) {
  const st = useStatusText();
  const presentation = POST_TYPE[type];

  return (
    <span className={cn(BADGE_SHAPE, "w-fit", BADGE_PAINT.neutral, className)}>
      <StatusIcon name={presentation.icon} className="size-3.5 shrink-0" />
      {st.of(presentation).label}
    </span>
  );
}
