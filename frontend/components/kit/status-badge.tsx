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
   */
  variant?: "auto" | "wash" | "solid";
  size?: "sm" | "md";
  /** Hide the label and expose it to assistive tech only. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Every tone used to paint as a wash, so a cancelled deal and a completed one
 * were the same weight of pastel and severity did not survive a glance down a
 * list. A wash also carried a hard dependency on its border: without one it
 * measured 1.01:1 against the page behind it and the pill disappeared,
 * leaving floating coloured text.
 *
 * Solid is now the default for every tone (spectrum.adobe.com/page/badge —
 * shape and fill convention only, not their colour set: our tones stay
 * `TONE_SOLID`). A saturated fill reads as a badge on its own, so it carries
 * no border and can't fail that contrast check in the first place. `wash` is
 * kept as an explicit opt-out for a screen that wants a quieter pill.
 */
function resolveVariant(
  variant: NonNullable<StatusBadgeProps["variant"]>,
): "wash" | "solid" {
  if (variant !== "auto") return variant;
  return "solid";
}

export function StatusBadge({
  status,
  variant = "auto",
  size = "md",
  iconOnly = false,
  className,
}: StatusBadgeProps) {
  const { tone, label, icon, hint } = status;
  const paint = resolveVariant(variant);

  return (
    <span
      title={hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium whitespace-nowrap",
        size === "sm"
          ? "h-6 px-2 text-[0.75rem]"
          : "h-7 px-2.5 text-[0.8125rem]",
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
