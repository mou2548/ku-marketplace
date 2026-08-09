import type { Tone } from "@/lib/status";

/**
 * Tailwind cannot see through a runtime string, so every tone's classes are
 * written out statically here and looked up by key. This is the only place a
 * tone becomes CSS — see docs/design/tokens.md §5.
 */
export const TONE_WASH: Record<Tone, string> = {
  neutral: "bg-tone-neutral-bg text-tone-neutral-fg",
  info: "bg-tone-info-bg text-tone-info-fg",
  success: "bg-tone-success-bg text-tone-success-fg",
  warning: "bg-tone-warning-bg text-tone-warning-fg",
  danger: "bg-tone-danger-bg text-tone-danger-fg",
  trade: "bg-tone-trade-bg text-tone-trade-fg",
};

export const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-tone-neutral-border",
  info: "border-tone-info-border",
  success: "border-tone-success-border",
  warning: "border-tone-warning-border",
  danger: "border-tone-danger-border",
  trade: "border-tone-trade-border",
};

export const TONE_SOLID: Record<Tone, string> = {
  neutral: "bg-tone-neutral-solid text-white",
  info: "bg-tone-info-solid text-white",
  success: "bg-tone-success-solid text-white",
  warning: "bg-tone-warning-solid text-amber-950",
  danger: "bg-tone-danger-solid text-white",
  trade: "bg-tone-trade-solid text-white",
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-tone-neutral-fg",
  info: "text-tone-info-fg",
  success: "text-tone-success-fg",
  warning: "text-tone-warning-fg",
  danger: "text-tone-danger-fg",
  trade: "text-tone-trade-fg",
};

/** A solid left rail — the per-sender accent on a group chat bubble. */
export const TONE_RAIL_LEFT: Record<Tone, string> = {
  neutral: "border-l-tone-neutral-solid",
  info: "border-l-tone-info-solid",
  success: "border-l-tone-success-solid",
  warning: "border-l-tone-warning-solid",
  danger: "border-l-tone-danger-solid",
  trade: "border-l-tone-trade-solid",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-tone-neutral-solid",
  info: "bg-tone-info-solid",
  success: "bg-tone-success-solid",
  warning: "bg-tone-warning-solid",
  danger: "bg-tone-danger-solid",
  trade: "bg-tone-trade-solid",
};
