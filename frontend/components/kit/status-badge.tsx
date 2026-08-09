import type { StatusPresentation } from "@/lib/status";
import { cn } from "@/lib/utils";

import { StatusIcon } from "./icon";
import { TONE_BORDER, TONE_SOLID, TONE_WASH } from "./tone";

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
   */
  variant?: "auto" | "wash" | "solid" | "outline";
  size?: "sm" | "md";
  /** Hide the label and expose it to assistive tech only. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Every tone used to paint as a wash, so a cancelled deal and a completed one
 * were the same weight of pastel and severity did not survive a glance down a
 * list. A failure now takes the solid fill and everything else keeps the wash,
 * which leaves exactly one loud thing on a screen: the thing that went wrong.
 *
 * `--tone-danger-solid` is rose-500; white on it is ~5.3:1, so the 13px label
 * still clears AA.
 */
function resolveVariant(
  variant: NonNullable<StatusBadgeProps["variant"]>,
  tone: StatusPresentation["tone"],
): "wash" | "solid" | "outline" {
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
  const { tone, label, icon, hint } = status;
  const paint = resolveVariant(variant, tone);

  return (
    <span
      title={hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium whitespace-nowrap",
        size === "sm"
          ? "h-6 px-2 text-[0.75rem]"
          : "h-7 px-2.5 text-[0.8125rem]",
        iconOnly && (size === "sm" ? "w-6 justify-center px-0" : "w-7 justify-center px-0"),
        paint === "wash" && TONE_WASH[tone],
        paint === "solid" && TONE_SOLID[tone],
        paint === "outline" &&
          cn("border bg-surface", TONE_BORDER[tone], TONE_WASH[tone], "bg-surface"),
        className,
      )}
    >
      <StatusIcon name={icon} className={size === "sm" ? "size-3.5" : "size-4"} />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}
