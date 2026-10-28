"use client";

import { useEffect } from "react";
import { Prompt } from "next/font/google";
import { Store } from "lucide-react";

import "./globals.css";
import { RouteError } from "./route-error";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * The last resort, for a failure in the root layout itself. It replaces that
 * layout, so it brings its own document, styles and font, and applies the
 * saved theme itself: the root layout reads it from the cookie on the server,
 * and that never ran.
 */
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    const dark = document.cookie
      .split("; ")
      .some((entry) => entry === "ku-theme=dark");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, []);

  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${prompt.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <title>Something went wrong - KU Marketplace</title>
        <RouteError
          fullPage
          onRetry={unstable_retry}
          home={{
            href: "/feed",
            label: "Back to the market",
            icon: <Store aria-hidden className="size-4" />,
          }}
        />
      </body>
    </html>
  );
}
