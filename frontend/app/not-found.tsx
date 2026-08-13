import { Compass } from "lucide-react";

import { LinkButton } from "@/components/kit/button";

/**
 * No shell: a 404 can be reached from outside the app group, so it cannot
 * assume the navbar is mounted above it.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-page px-6 py-24 text-center">
      <span className="grid size-16 place-items-center rounded-pill bg-brand-subtle text-ink-brand">
        <Compass aria-hidden className="size-8" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-[1.875rem] leading-[1.2] font-bold tracking-[-0.016em]">
          Page not found
        </h1>
        <p className="max-w-sm text-[0.9375rem] leading-[1.7] text-ink-muted">
          This page does not exist, or it moved during the redesign. The market
          is the best place to pick things up again.
        </p>
      </div>

      <LinkButton href="/market" size="lg">
        Go to the market
      </LinkButton>
    </main>
  );
}
