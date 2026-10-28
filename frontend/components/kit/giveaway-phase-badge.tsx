import {
  CheckCheck,
  Clock,
  Gift,
  Hourglass,
  Lock,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";

import type { GiveawayPhase } from "@/lib/giveaway-phase";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

import { TONE_CHIP } from "./tone";

/**
 * The giveaway's state as a badge, from `giveawayPhase` rather than the
 * stored status, so it always agrees with the dates printed beside it
 * (audit G01). Same chip as a washed `StatusBadge`: tone, icon and words.
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
  className,
}: {
  phase: GiveawayPhase;
  className?: string;
}) {
  const { label, hint, tone, icon: Icon } = PHASE[phase];
  return (
    <span
      title={hint}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-pill border px-2 text-meta font-medium whitespace-nowrap",
        TONE_CHIP[tone],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}
