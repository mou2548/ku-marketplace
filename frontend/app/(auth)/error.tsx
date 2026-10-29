"use client";

import { LogIn } from "lucide-react";

import { RouteError } from "../route-error";

/** The auth screens have no shell, so the panel fills the page. */
export default function AuthError({
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
        href: "/login",
        label: "Back to sign in",
        icon: <LogIn aria-hidden className="size-4" />,
      }}
    />
  );
}
