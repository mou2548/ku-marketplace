import { useStatusText } from "@/lib/status-text";
import type { StatusPresentation } from "@/lib/status";
import { cn } from "@/lib/utils";

import { StatusIcon } from "./icon";
import { TONE_CHIP, TONE_SOLID } from "./tone";

/**
 * Research risk R1 + principle 4: a status reaches the screen as a Thai
 * sentence, a tone, AND an icon. Never a bare enum, never colour alone
 * (WCAG 1.4.1).
 *
 * Feed it a presentation object from lib/status.ts — never a raw string.
 */
export interface StatusBadgeProps {
  status: StatusPresentation;
  /**
   * `auto` fills a danger badge and washes everything else — see below.
   * The explicit variants override that for the rare case a screen needs one.
   * That comment was accurate before the behaviour drifted away from it; it
   * describes the code again.
   */
  variant?: "auto" | "wash" | "solid";
  size?: "sm" | "md";
  /** Hide the label and expose it to assistive tech only. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Danger fills; every other tone washes.
 *
 * The history of this line is worth keeping, because both previous answers
 * were reactions to a real defect and both overshot.
 *
 * First every tone was a bare wash, so a cancelled deal and a completed one
 * were the same weight of pastel and severity did not survive a glance down a
 * list. Worse, a bare wash measured 1.01:1 against the page and the pill
 * vanished, leaving floating coloured text — a WCAG 1.4.11 failure on the
 * component's own boundary.
 *
 * The fix for that was to fill every tone. That solved the contrast problem
 * and created a louder one: `StatusBadge` renders in 20 files, the inventory
 * grid paints one per slot across up to 18 slots, and a history row carries
 * three. `register.md` §2 budgets one saturated fill per screen. This is the
 * single largest source of the "garish" reading the 2026 brief is reacting to.
 *
 * `TONE_CHIP` was the answer all along and it already existed: a wash plus a
 * border plus AA-safe text, which is how `tokens.md` §5 specified a tone from
 * the beginning. It cannot fail the boundary check the bare wash failed.
 *
 * So: danger stays solid, because a cancelled or reported deal is the one
 * status that should stop a scanning eye. Everything else is a chip, and
 * `solid` remains available for the rare screen that has a reason.
 */
function resolveVariant(
  variant: NonNullable<StatusBadgeProps["variant"]>,
  tone: StatusPresentation["tone"],
): "wash" | "solid" {
  if (variant !== "auto") return variant;
  return tone === "danger" ? "solid" : "wash";
}

export function StatusBadge({
  status,
  variant = "auto",
  size = "md",
  iconOnly = false,
  className,
}: StatusBadgeProps) {
  const { tone, icon } = status;
  const { label, hint } = useStatusText().of(status);
  const paint = resolveVariant(variant, tone);

  return (
    <span
      title={hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium whitespace-nowrap",
        size === "sm"
          ? "h-6 px-2 text-meta"
          : "h-7 px-2.5 text-caption",
        iconOnly && (size === "sm" ? "w-6 justify-center px-0" : "w-7 justify-center px-0"),
        paint === "wash" && cn("border", TONE_CHIP[tone]),
        paint === "solid" && TONE_SOLID[tone],
        className,
      )}
    >
      <StatusIcon name={icon} className={size === "sm" ? "size-3.5" : "size-4"} />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}
