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
  variant?: "wash" | "solid" | "outline";
  size?: "sm" | "md";
  /** Hide the label and expose it to assistive tech only. */
  iconOnly?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  variant = "wash",
  size = "md",
  iconOnly = false,
  className,
}: StatusBadgeProps) {
  const { tone, label, icon, hint } = status;

  return (
    <span
      title={hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium whitespace-nowrap",
        size === "sm"
          ? "h-6 px-2 text-[0.75rem]"
          : "h-7 px-2.5 text-[0.8125rem]",
        iconOnly && (size === "sm" ? "w-6 justify-center px-0" : "w-7 justify-center px-0"),
        variant === "wash" && TONE_WASH[tone],
        variant === "solid" && TONE_SOLID[tone],
        variant === "outline" &&
          cn("border bg-surface", TONE_BORDER[tone], TONE_WASH[tone], "bg-surface"),
        className,
      )}
    >
      <StatusIcon name={icon} className={size === "sm" ? "size-3.5" : "size-4"} />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}
