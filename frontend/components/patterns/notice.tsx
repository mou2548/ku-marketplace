import type { ReactNode } from "react";
import {
  CircleCheck,
  CircleX,
  Info,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { NOTICE_TILE } from "@/components/kit/tone";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * A message box: a fact about the surface it sits on, not the status of a
 * thing in a list.
 *
 * Quiet badges, Style 3 (docs/redesign/quiet-badges/plan.md): a white
 * surface with a 1px hairline, ink text, and the tone carried only by a 32px
 * tinted tile around the icon. No tinted background and no coloured border.
 * The one exception is a blocking `danger` (a real error or a blocked
 * state), which is a solid strip with on-signal text so it cannot be read
 * past.
 *
 * The box owns the tile and the chrome; `contentClassName` lays out the text
 * beside it, `className` places the box itself.
 */
export interface NoticeProps {
  /**
   * `brand` is not a `Tone`. Two call sites (a freshly listed item, and the
   * post composer's guidance) are about this product rather than about a
   * severity, and forcing them into `success` would say something the screen
   * does not mean. Trade has no colour and reads as neutral.
   */
  tone: Tone | "brand";
  /** The icon in the tile. Defaults to the tone's own. */
  icon?: LucideIcon;
  /**
   * Draw the solid danger strip. Defaults to true for `danger`, which is
   * for real errors and blocking states only; a danger explanation (what a
   * destructive action will do) passes false and gets a white box with a
   * red icon tile (owner ruling 2026-10-30).
   */
  blocking?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const DEFAULT_ICON: Record<Tone | "brand", LucideIcon> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
  trade: Info,
  brand: Sparkles,
};

export function Notice({
  tone,
  icon,
  blocking: blockingProp,
  children,
  className,
  contentClassName,
}: NoticeProps) {
  const Icon = icon ?? DEFAULT_ICON[tone];
  const blocking = tone === "danger" && (blockingProp ?? true);

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-control border px-3.5 py-3",
        blocking
          ? "border-signal-danger-solid bg-signal-danger-solid text-on-signal"
          : "border-line bg-surface text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-[8px]",
          blocking
            ? "text-on-signal"
            : tone === "brand"
              ? "bg-brand-subtle text-ink-brand"
              : NOTICE_TILE[tone],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className={cn("min-w-0 flex-1 self-center", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
