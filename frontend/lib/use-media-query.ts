"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches. `false` on the server and
 * during hydration, then the real answer, so a layout that depends on it never
 * mismatches the markup the server sent.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
