"use client";

import { LayoutDashboard } from "lucide-react";

import { RouteError } from "../route-error";

/** Inside the admin shell: a failed page keeps the rail and its way out. */
export default function AdminError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      onRetry={unstable_retry}
      home={{
        href: "/admin",
        label: "Back to the dashboard",
        icon: <LayoutDashboard aria-hidden className="size-4" />,
      }}
    />
  );
}
