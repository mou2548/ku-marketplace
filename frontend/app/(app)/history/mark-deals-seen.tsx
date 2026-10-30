"use client";

import { useEffect } from "react";

import { writeSeenKeys } from "@/lib/deal-badge";

/**
 * Opening the History list counts as seeing every deal waiting on the viewer,
 * which turns the nav dot off until something new needs them
 * (lib/deal-badge.ts). The keys come from this page's own fetch, not the
 * layout's, which is not re-fetched on client navigation and can be stale.
 */
export function MarkDealsSeen({ cookie, keys }: { cookie: string; keys: string[] }) {
  const serialized = keys.join(",");
  useEffect(() => {
    writeSeenKeys(cookie, serialized ? serialized.split(",") : []);
  }, [cookie, serialized]);
  return null;
}
