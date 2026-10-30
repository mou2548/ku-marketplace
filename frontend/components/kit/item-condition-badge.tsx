import { getCopy } from "@/lib/copy";
import { type ItemCondition } from "@/lib/status";
import { cn } from "@/lib/utils";

import { BADGE_PAINT } from "./tone";

/**
 * Item condition stays with the product details, separate from seller
 * identity. Condition is a fact about the item, not something to act on, so
 * it is information tier for every grade: a soft neutral chip. The grade is
 * in the words.
 */
export function ItemConditionBadge({
  condition,
}: {
  condition: ItemCondition;
}) {
  const t = getCopy();

  return (
    <span
      className={cn(
        "inline-flex min-h-[22px] w-fit max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-[4px] px-2 py-0.5 text-meta leading-[1.45] font-normal",
        BADGE_PAINT.neutral,
      )}
    >
      <span>{t("inventory.condition")}</span>
      <span className="font-semibold">
        {t(`card.conditionValue.${condition}`)}
      </span>
    </span>
  );
}
