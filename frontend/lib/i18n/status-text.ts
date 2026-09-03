"use client";

import { useTranslations } from "next-intl";

import type { StatusPresentation } from "@/lib/status";

/**
 * Turns a presentation object's keys into the words on screen.
 *
 * `lib/status.ts` carries keys rather than English now, so exactly one hook
 * knows how to resolve them and no screen has to remember the `status.`
 * prefix. next-intl's `useTranslations` runs in Server Components as well as
 * Client ones, which matters here: `StatusBadge` and friends are rendered from
 * both and have no "use client" of their own.
 */
export interface StatusText {
  label: string;
  hint?: string;
}

export function useStatusText() {
  const t = useTranslations("status");

  return {
    /** A presentation object from one of the tables in lib/status.ts. */
    of(status: Pick<StatusPresentation, "labelKey" | "hintKey">): StatusText {
      return {
        label: t(status.labelKey),
        hint: status.hintKey ? t(status.hintKey) : undefined,
      };
    },
    /** A bare key, for the actor prompts and deadlines. */
    key(labelKey: string): string {
      return t(labelKey);
    },
  };
}
