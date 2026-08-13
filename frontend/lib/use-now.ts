"use client";

import { useSyncExternalStore } from "react";

/**
 * A ticking clock that is safe to read during render.
 *
 * Countdowns (research R2) need the current time on every frame, but calling
 * `Date.now()` in a component body is an impure read, and seeding it from an
 * effect causes a cascading render. `useSyncExternalStore` is the sanctioned
 * shape: subscribe to an interval, read a snapshot.
 *
 * The snapshot is floored to the tick so repeated reads inside one render pass
 * return an identical value — React requires a stable snapshot.
 *
 * The server snapshot is `0`, meaning "unknown". Callers render a placeholder
 * for that value rather than a wrong time; the first client paint replaces it.
 */
export const UNKNOWN_TIME = 0;

export function useNow(intervalMs = 1000): number {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, intervalMs);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => UNKNOWN_TIME,
  );
}
