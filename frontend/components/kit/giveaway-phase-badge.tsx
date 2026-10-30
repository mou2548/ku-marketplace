import {
  CheckCheck,
  Clock,
  Gift,
  Hourglass,
  Lock,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";

import { badgePaint } from "@/lib/badge-tier";
import {
  GIVEAWAY_PHASE_LIFECYCLE,
  type GiveawayPhase,
} from "@/lib/giveaway-phase";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

import { BADGE_PAINT, BADGE_SHAPE } from "./tone";

/**
 * The giveaway's state as a badge, from `giveawayPhase` rather than the
 * stored status, so it always agrees with the dates printed beside it
 * (audit G01). Same badge as `StatusBadge`: two tiers, icon and words.
 */
const PHASE: Record<GiveawayPhase, { label: string; hint: string; tone: Tone; icon: LucideIcon }> = {
  upcoming: {
    label: "Opens soon",
    hint: "Registration has not opened yet",
    tone: "info",
    icon: Clock,
  },
  open: {
    label: "Open for entries",
    hint: "Registration is open",
    tone: "info",
    icon: Gift,
  },
  full: {
    label: "All places taken",
    hint: "Every first-come place has been allocated",
    tone: "warning",
    icon: Lock,
  },
  closed: {
    label: "Registration closed",
    hint: "Recipients are still to be chosen",
    tone: "warning",
    icon: Hourglass,
  },
  pickup: {
    label: "Collection open",
    hint: "Recipients have been chosen; collection is still open",
    tone: "info",
    icon: PackageCheck,
  },
  finished: {
    label: "Finished",
    hint: "This giveaway is over",
    tone: "neutral",
    icon: CheckCheck,
  },
};

export function GiveawayPhaseBadge({
  phase,
  viewerActs = false,
  className,
}: {
  phase: GiveawayPhase;
  /** From `viewerActsOnGiveawayPhase`; left out, the badge is information. */
  viewerActs?: boolean;
  className?: string;
}) {
  const { label, hint, tone, icon: Icon } = PHASE[phase];
  return (
    <span
      title={hint}
      className={cn(
        BADGE_SHAPE,
        BADGE_PAINT[badgePaint(tone, GIVEAWAY_PHASE_LIFECYCLE[phase], viewerActs)],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}
