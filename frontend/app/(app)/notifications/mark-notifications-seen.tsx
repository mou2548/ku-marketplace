"use client";

import { useEffect } from "react";

import { writeSeen } from "@/lib/notification-seen";

/**
 * Opening the Notifications list counts as seeing everything on it: the bell's
 * dot goes out and stays out until something new arrives
 * (lib/notification-seen.ts). The keys come from this page's own fetch, not the
 * layout's, which is not re-fetched on client navigation and can be stale.
 */
export function MarkNotificationsSeen({
  cookie,
  keys,
}: {
  cookie: string;
  keys: string[];
}) {
  const serialized = keys.join(",");
  useEffect(() => {
    writeSeen(cookie, serialized ? serialized.split(",") : []);
  }, [cookie, serialized]);
  return null;
}
