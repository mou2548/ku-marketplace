"use client";

import { AlertTriangle, RefreshCw, Store } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Surface } from "@/components/kit/surface";

export default function AppError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto grid min-h-[min(36rem,70dvh)] w-full max-w-2xl place-items-center py-10">
      <Surface
        shape="panel"
        className="texture-grid flex w-full flex-col items-center gap-4 p-6 text-center sm:p-10"
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
          <Button size="lg" block onPress={unstable_retry}>
            <RefreshCw aria-hidden className="size-4" />
            Try again
          </Button>
          <LinkButton size="lg" block variant="secondary" href="/feed">
            <Store aria-hidden className="size-4" />
            Back to the market
          </LinkButton>
        </div>
      </Surface>
    </div>
  );
}
