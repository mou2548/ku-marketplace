"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` every `intervalMs` while the caller is mounted and the tab
 * is visible.
 *
 * No realtime transport exists anywhere in this app (no WebSocket/SSE) — this
 * is the simplest way to keep a chat thread from going stale without one.
 * Unlike `useNow` (lib/use-now.ts), the callback is a side effect (a refetch),
 * not a render-safe snapshot, so this is a plain interval effect rather than a
 * `useSyncExternalStore` subscription.
 *
 * A hidden tab does not poll at all (audit B05): nobody is reading it, and a
 * phone with the app in the background kept hitting the API. Coming back runs
 * the callback at once, so the screen is current the moment it is seen.
 */
export function usePolling(callback: () => void, intervalMs: number) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (id === undefined) id = setInterval(() => savedCallback.current(), intervalMs);
    };
    const stop = () => {
      if (id !== undefined) clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        savedCallback.current();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
