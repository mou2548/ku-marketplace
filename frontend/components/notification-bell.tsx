"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { getUnreadCount, onNotificationsChanged } from "@/lib/notifications";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Reads localStorage (unavailable during SSR) — must run post-mount, not
    // as a lazy useState initializer, or the badge would hydration-mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnreadCount(getUnreadCount());
    return onNotificationsChanged(() => setUnreadCount(getUnreadCount()));
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="relative flex size-8 items-center justify-center rounded-full text-primary-dark hover:bg-[#F4F6F8]"
    >
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 flex size-2.5 items-center justify-center rounded-full bg-error ring-2 ring-white" />
      )}
    </Link>
  );
}
