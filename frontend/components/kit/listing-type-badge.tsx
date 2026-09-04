import { useStatusText } from "@/lib/i18n/status-text";
import { POST_TYPE, type PostType } from "@/lib/status";
import { cn } from "@/lib/utils";

export function ListingTypeBadge({
  type,
  className,
}: {
  type: PostType;
  className?: string;
}) {
  const st = useStatusText();

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-chip px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold",
        type === "SellOnly" &&
          "bg-[var(--listing-sale-bg)] text-[var(--listing-sale-fg)]",
        type === "TradeOnly" &&
          "bg-[var(--listing-trade-bg)] text-[var(--listing-trade-fg)]",
        type === "Both" &&
          "bg-[var(--listing-both-bg)] text-[var(--listing-both-fg)]",
        className,
      )}
    >
      {st.of(POST_TYPE[type]).label}
    </span>
  );
}
