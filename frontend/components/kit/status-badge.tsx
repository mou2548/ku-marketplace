import { badgePaint } from "@/lib/badge-tier";
import { useStatusText } from "@/lib/status-text";
import type { StatusPresentation } from "@/lib/status";
import { cn } from "@/lib/utils";

import { StatusIcon } from "./icon";
import { BADGE_PAINT, BADGE_SHAPE } from "./tone";

/**
 * Research risk R1 + principle 4: a status reaches the screen as a sentence,
 * a tone, AND an icon. Never a bare enum, never colour alone (WCAG 1.4.1).
 *
 * Feed it a presentation object from lib/status.ts — never a raw string.
 *
 * Two tiers (quiet badges, docs/redesign/quiet-badges/plan.md): a status
 * someone has to act on is a calm solid; everything else is a soft neutral
 * chip, or soft green for a good outcome. The tier is decided in
 * `lib/badge-tier.ts` from the tone and the status's lifecycle, never here.
 */
export interface StatusBadgeProps {
  status: StatusPresentation;
  /**
   * Kept for call sites; both sizes are the one 22px badge now. `sm` and
   * `md` used to differ by 4px, which the two-tier style does not need.
   */
  size?: "sm" | "md";
  /**
   * The viewer is the one who must act on this status (whose turn, from the
   * helpers in `lib/badge-tier.ts`). Only then can an open warning or danger
   * status take the act-now solid; left out, the badge is information tier.
   */
  viewerActs?: boolean;
  /** Hide the label and expose it to assistive tech only. */
  iconOnly?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  viewerActs = false,
  iconOnly = false,
  className,
}: StatusBadgeProps) {
  const { tone, lifecycle, icon } = status;
  const { label, hint } = useStatusText().of(status);

  return (
    <span
      title={hint}
      className={cn(
        BADGE_SHAPE,
        BADGE_PAINT[badgePaint(tone, lifecycle, viewerActs)],
        iconOnly && "w-[22px] justify-center px-0",
        className,
      )}
    >
      <StatusIcon name={icon} className="size-3.5 shrink-0" />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}
