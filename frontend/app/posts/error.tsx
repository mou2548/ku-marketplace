"use client";

import { Store } from "lucide-react";

import { RouteError } from "../route-error";

/** `/posts` sits outside every route group, so there is no shell around it. */
export default function PostsError({
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
