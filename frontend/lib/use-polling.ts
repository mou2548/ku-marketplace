"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` every `intervalMs` while the caller is mounted.
 *
 * No realtime transport exists anywhere in this app (no WebSocket/SSE) — this
 * is the simplest way to keep a chat thread from going stale without one.
 * Unlike `useNow` (lib/use-now.ts), the callback is a side effect (a refetch),
 * not a render-safe snapshot, so this is a plain interval effect rather than a
 * `useSyncExternalStore` subscription.
 */
export function usePolling(callback: () => void, intervalMs: number) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
