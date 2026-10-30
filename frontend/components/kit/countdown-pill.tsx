"use client";

import { useEffect } from "react";
import { AlarmClock, TimerOff } from "lucide-react";

import type { Deadline, Tone } from "@/lib/status";
import { UNKNOWN_TIME, useNow } from "@/lib/use-now";
import { useStatusText } from "@/lib/status-text";
import { badgePaint } from "@/lib/badge-tier";
import { cn } from "@/lib/utils";

import { BADGE_PAINT, BADGE_SHAPE } from "./tone";

/**
 * Research risk R2. Flow 1 runs four clocks — 24h to confirm a slip, 8h
 * re-reminders, 72h cancellation escalation, delivery estimate + 3 days — and
 * none of them were visible in the old UI. A deadline the user only learns
 * about after it expires reads as the product punishing them.
 *
 * Principle 2: time is a first-class object. The pill escalates tone as the
 * deadline approaches so urgency is legible before it matters.
 */

/** `1d 2h`, `3h 20m`, `4:05` or `12s` — how long is left, at the precision that matters. */
export function formatRemaining(input: number): string {
  const ms = Math.max(0, input);
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours >= 1) return `${hours}h ${minutes}m`;
  if (minutes >= 1) return `${minutes}:${String(seconds).padStart(2, "0")}`;
  return `${seconds}s`;
}

function toneFor(ms: number): Tone {
  if (ms <= 0) return "danger";
  if (ms < 60 * 60 * 1000) return "danger"; // under an hour
  if (ms < 6 * 60 * 60 * 1000) return "warning";
  return "info";
}

export interface CountdownPillProps {
  deadline: Deadline;
  /** Shown instead of the timer once the deadline has passed. */
  expiredLabel?: string;
  /** Render the deadline's own label alongside the timer. */
  showLabel?: boolean;
  /**
   * Keep that label once the deadline has passed. Off when `expiredLabel`
   * already says it all: "Registration closes Registration closed".
   */
  labelOnExpiry?: boolean;
  className?: string;
  onExpire?: () => void;
  /**
   * The viewer is the one who must move before this clock runs out (for a
   * deal clock, `viewerActsOnDeadline`). Only then does it turn into the
   * act-now solid near the end; left out, it stays information tier.
   */
  viewerActs?: boolean;
}

export function CountdownPill({
  deadline,
  expiredLabel = "Past due",
  showLabel = false,
  labelOnExpiry = true,
  className,
  onExpire,
  viewerActs = false,
}: CountdownPillProps) {
  const st = useStatusText();
  const now = useNow(1000);
  const known = now !== UNKNOWN_TIME;

  useEffect(() => {
    if (known && now >= deadline.expiresAt) onExpire?.();
  }, [known, now, deadline.expiresAt, onExpire]);

  const ms = deadline.expiresAt - now;
  const expired = known && ms <= 0;
  const tone = known ? toneFor(ms) : "info";

  return (
    <span
      className={cn(
        BADGE_SHAPE,
        // A labelled countdown can be long; let it wrap on a phone.
        "h-auto min-h-[22px] py-0.5 leading-[1.45] whitespace-normal",
        // Information tier until the countdown's own warning threshold
        // (under six hours), then a calm solid: warning, and danger under an
        // hour or past due, but only for the viewer who has to move (owner
        // ruling 2026-10-30: the other side sees the information tier).
        BADGE_PAINT[badgePaint(tone, "open", viewerActs)],
        className,
      )}
    >
      {expired ? (
        <TimerOff aria-hidden className="size-3.5 shrink-0" />
      ) : (
        <AlarmClock aria-hidden className="size-3.5 shrink-0" />
      )}
      {showLabel && (labelOnExpiry || !expired) ? (
        // Was text-white/70, which measured 3.25:1 to 4.24:1 depending on the
        // tone underneath — every one of them under 4.5:1 at 13px. The label
        // steps back by weight now, not by opacity.
        <span className="font-normal">{st.key(deadline.labelKey)}</span>
      ) : null}
      <time
        dateTime={new Date(deadline.expiresAt).toISOString()}
        data-numeric
        // suppressHydrationWarning: the first client tick legitimately differs
        // from the server render by the request's transit time.
        suppressHydrationWarning
      >
        {!known ? "…" : expired ? expiredLabel : `${formatRemaining(ms)} left`}
      </time>
    </span>
  );
}
