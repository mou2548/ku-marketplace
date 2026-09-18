import { getCopy } from "@/lib/copy";

import type { StatusPresentation } from "@/lib/status";

/**
 * Turns a presentation object's keys into the words on screen.
 *
 * `lib/status.ts` carries keys rather than English, so exactly one module knows
 * how to resolve them and no screen has to remember the `status.` prefix.
 *
 * The `use` prefix is left over from when this read a React context; it is a
 * plain function now and works unchanged in Server and Client Components,
 * which matters because `StatusBadge` and friends are rendered from both.
 */
export interface StatusText {
  label: string;
  hint?: string;
}

export function useStatusText() {
  const t = getCopy("status");

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
