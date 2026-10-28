"use client";

import { Store } from "lucide-react";

import { RouteError } from "./route-error";

/**
 * Catches what a route group's own `error.tsx` cannot: a failure in the group
 * layout itself, such as the admin layout throwing when the API is unreachable
 * (audit N01). An `error.tsx` never wraps the layout beside it, so without this
 * file that case would fall through to `global-error.tsx` and lose the root
 * layout's fonts and theme.
 */
export default function RootError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      fullPage
      onRetry={unstable_retry}
      home={{
        href: "/feed",
        label: "Back to the market",
        icon: <Store aria-hidden className="size-4" />,
      }}
    />
  );
}
