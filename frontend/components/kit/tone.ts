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

/**
 * **Use this, not `TONE_WASH`, for anything with an edge** — a chip, a pill, a
 * badge, a notice.
 *
 * A wash is a 100-step tint and the page itself is `#f4f7f5`, so a bare wash
 * measured 1.01:1 against the page it sat on: the shape vanished and only the
 * coloured text was left, which read as a stray word rather than a badge. It
 * also failed WCAG 1.4.11, which wants 3:1 on the boundary of a UI component.
 *
 * The tone was always specified as a trio — wash, border, AA-safe text
 * (tokens.md §5). `TONE_WASH` is only two thirds of it. Pairing them by hand
 * worked in `toast` and `actor-line` and was forgotten everywhere else, so the
 * pair is one token now and there is nothing left to forget.
 *
 * Apply with `border` — the width is the caller's, the colour is the tone's.
 */
export const TONE_CHIP: Record<Tone, string> = {
  neutral: "bg-tone-neutral-bg text-tone-neutral-fg border-tone-neutral-border",
  info: "bg-tone-info-bg text-tone-info-fg border-tone-info-border",
  success: "bg-tone-success-bg text-tone-success-fg border-tone-success-border",
  warning: "bg-tone-warning-bg text-tone-warning-fg border-tone-warning-border",
  danger: "bg-tone-danger-bg text-tone-danger-fg border-tone-danger-border",
  trade: "bg-tone-trade-bg text-tone-trade-fg border-tone-trade-border",
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
