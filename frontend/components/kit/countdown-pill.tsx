"use client";

import { useEffect } from "react";
import { AlarmClock, TimerOff } from "lucide-react";

import type { Deadline, Tone } from "@/lib/status";
import { UNKNOWN_TIME, useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { TONE_SOLID } from "./tone";

/**
 * Research risk R2. Flow 1 runs four clocks — 24h to confirm a slip, 8h
 * re-reminders, 72h cancellation escalation, delivery estimate + 3 days — and
 * none of them were visible in the old UI. A deadline the user only learns
 * about after it expires reads as the product punishing them.
 *
 * Principle 2: time is a first-class object. The pill escalates tone as the
 * deadline approaches so urgency is legible before it matters.
 */

function format(input: number): string {
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
  className?: string;
  onExpire?: () => void;
}

export function CountdownPill({
  deadline,
  expiredLabel = "Past due",
  showLabel = false,
  className,
  onExpire,
}: CountdownPillProps) {
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
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1",
        "text-[0.8125rem] leading-[1.5] font-medium",
        TONE_SOLID[tone],
        className,
      )}
    >
      {expired ? (
        <TimerOff aria-hidden className="size-4" />
      ) : (
        <AlarmClock aria-hidden className="size-4" />
      )}
      {showLabel ? (
        <span className="text-white/70">{deadline.label}</span>
      ) : null}
      <time
        dateTime={new Date(deadline.expiresAt).toISOString()}
        data-numeric
        // suppressHydrationWarning: the first client tick legitimately differs
        // from the server render by the request's transit time.
        suppressHydrationWarning
      >
        {!known ? "…" : expired ? expiredLabel : `${format(ms)} left`}
      </time>
    </span>
  );
}
