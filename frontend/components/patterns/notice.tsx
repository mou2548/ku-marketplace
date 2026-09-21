import type { ReactNode } from "react";

import { Surface } from "@/components/kit/surface";
import { TONE_CHIP } from "@/components/kit/tone";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * A tinted callout: a fact about the surface it sits on, not the status of a
 * thing in a list.
 *
 * This is the first occupant of `components/patterns/`, which `CLAUDE.md` §8
 * has always specified and which did not exist. That is the whole reason this
 * shape was copied inline into fifteen files — there was nowhere to put it.
 *
 * **The side tab is gone.** Every copy was a tone wash under a 4px left
 * border, which the bundled detector flags as the most recognisable tell of a
 * generated interface, and which `register.md` §2 counts against the one
 * saturated element a screen is allowed. A full hairline in the tone's own
 * border colour separates the callout just as well, reads quieter, and is
 * exactly the trio `tokens.md` §5 specified for a tone from the beginning:
 * wash, border, AA-safe text.
 *
 * The fifteen copies were not even consistent with each other — one used a
 * neutral grey wash under a `line-strong` border, so "the pattern" was
 * already two patterns.
 *
 * It supplies chrome and nothing else: tone, border, radius, padding. Layout
 * stays with the caller, because these callouts are genuinely two shapes — a
 * stack of paragraphs, and an icon beside a block of text — and a component
 * that picks one silently rearranges the other.
 */
export interface NoticeProps {
  /**
   * `brand` is not a `Tone`. Two call sites — a freshly listed item, and the
   * post composer's guidance — are about this product rather than about a
   * severity, and forcing them into `success` would say something the screen
   * does not mean.
   */
  tone: Tone | "brand";
  children: ReactNode;
  className?: string;
}

const BRAND_CHIP = "bg-brand-subtle text-ink-brand border-brand-subtle-hover";

export function Notice({ tone, children, className }: NoticeProps) {
  return (
    <Surface
      shape="card"
      elevation="flat"
      className={cn(
        "border p-4",
        tone === "brand" ? BRAND_CHIP : TONE_CHIP[tone],
        className,
      )}
    >
      {children}
    </Surface>
  );
}
