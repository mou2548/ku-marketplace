import type { BadgePaint } from "@/lib/badge-tier";
import type { Tone } from "@/lib/status";

/**
 * Tailwind cannot see through a runtime string, so every tone's classes are
 * written out statically here and looked up by key. This is the only place a
 * tone becomes CSS.
 *
 * Trade has no colour (quiet badges, docs/redesign/quiet-badges/plan.md):
 * wherever a tone map takes `trade`, it resolves to the neutral.
 */

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-tone-neutral-fg",
  info: "text-tone-info-fg",
  success: "text-tone-success-fg",
  warning: "text-tone-warning-fg",
  danger: "text-tone-danger-fg",
  trade: "text-tone-neutral-fg",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-tone-neutral-solid",
  info: "bg-tone-info-solid",
  success: "bg-tone-success-solid",
  warning: "bg-tone-warning-solid",
  danger: "bg-tone-danger-solid",
  trade: "bg-tone-neutral-solid",
};

/* ------------------------------------------------------------------ *
 * Quiet badges (Style 3, docs/redesign/quiet-badges/plan.md).
 * ------------------------------------------------------------------ */

/**
 * A badge's fill and text, by paint (`lib/badge-tier.ts`). Information is a
 * soft neutral (or soft green for a good outcome) with no border; "act now"
 * is a calm solid at 600 weight. Nothing else.
 */
export const BADGE_PAINT: Record<BadgePaint, string> = {
  neutral: "bg-signal-neutral-bg text-signal-neutral-fg",
  success: "bg-signal-success-bg text-signal-success-fg",
  "act-warning":
    "bg-signal-warning-solid text-on-signal-warning font-semibold",
  "act-danger": "bg-signal-danger-solid text-on-signal font-semibold",
};

/** The badge shape every chip shares: 22px, 4px radius, 12px/500. */
export const BADGE_SHAPE =
  "inline-flex h-[22px] items-center gap-1 rounded-[4px] px-2 text-meta leading-none font-medium whitespace-nowrap";

/**
 * The 32px icon tile in a message box. Trade has no colour (it reads as
 * neutral); everything else takes its signal's soft fill and text.
 */
export const NOTICE_TILE: Record<Tone, string> = {
  neutral: "bg-signal-neutral-bg text-signal-neutral-fg",
  info: "bg-signal-info-bg text-signal-info-fg",
  success: "bg-signal-success-bg text-signal-success-fg",
  warning: "bg-signal-warning-bg text-signal-warning-fg",
  danger: "bg-signal-danger-bg text-signal-danger-fg",
  trade: "bg-signal-neutral-bg text-signal-neutral-fg",
};

/** Signal text for an icon or a short line that is not in a box. */
export const SIGNAL_TEXT: Record<Tone, string> = {
  neutral: "text-signal-neutral-fg",
  info: "text-signal-info-fg",
  success: "text-signal-success-fg",
  warning: "text-signal-warning-fg",
  danger: "text-signal-danger-fg",
  trade: "text-signal-neutral-fg",
};
