import { useTranslations } from "next-intl";
import { type ItemCondition } from "@/lib/status";
import { cn } from "@/lib/utils";

const CONDITION_TONE: Record<ItemCondition, string> = {
  New: "bg-tone-success-bg text-tone-success-fg",
  "Very Good": "bg-tone-success-bg text-tone-success-fg",
  Good: "bg-tone-warning-bg text-tone-warning-fg",
  Acceptable: "bg-tone-warning-bg text-tone-warning-fg",
  Poor: "bg-tone-danger-bg text-tone-danger-fg",
};

/** Item condition stays with the product details, separate from seller identity. */
export function ItemConditionBadge({
  condition,
}: {
  condition: ItemCondition;
}) {
  const t = useTranslations();

  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-chip px-2 py-1 text-[0.75rem] leading-5",
        CONDITION_TONE[condition],
      )}
    >
      <span className="text-ink-secondary">{t("inventory.condition")}</span>
      <span className="font-semibold">
        {t(`card.conditionValue.${condition}`)}
      </span>
    </span>
  );
}
