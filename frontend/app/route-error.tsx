"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Surface } from "@/components/kit/surface";

/**
 * The body shared by every route error boundary (audit S03), so a failure
 * reads the same wherever it happens: what went wrong, that nothing was
 * changed, one way to retry, and one way out. Same panel as
 * `(app)/error.tsx`, minus the grid texture, which CLAUDE.md keeps to the
 * inventory and trade surfaces.
 *
 * `fullPage` is for boundaries with no shell around them (auth, root, global):
 * the panel then centres itself in the viewport and owns the `main` landmark.
 */
export function RouteError({
  onRetry,
  home,
  fullPage = false,
}: {
  onRetry: () => void;
  home: { href: string; label: string; icon: React.ReactNode };
  fullPage?: boolean;
}) {
  const panel = (
    <Surface
      shape="panel"
      className="flex w-full flex-col items-center gap-4 p-6 text-center sm:p-10"
    >
      <span className="grid size-14 place-items-center rounded-pill bg-tone-danger-bg text-tone-danger-fg">
        <AlertTriangle aria-hidden className="size-6" />
      </span>

      <div className="max-w-md">
        <h1 className="text-h1">This page could not load</h1>
        <p className="mt-2 text-body text-ink-muted">
          The connection may have been interrupted. Your account and items
          have not been changed.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
        <Button size="lg" block onPress={onRetry}>
          <RefreshCw aria-hidden className="size-4" />
          Try again
        </Button>
        <LinkButton size="lg" block variant="secondary" href={home.href}>
          {home.icon}
          {home.label}
        </LinkButton>
      </div>
    </Surface>
  );

  return fullPage ? (
    <main
      id="main"
      className="flex min-h-dvh items-center justify-center bg-page px-4 py-10"
    >
      <div className="w-full max-w-2xl">{panel}</div>
    </main>
  ) : (
    <div className="mx-auto grid min-h-[min(36rem,70dvh)] w-full max-w-2xl place-items-center py-10">
      {panel}
    </div>
  );
}
