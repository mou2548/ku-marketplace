import { ArrowRight } from "lucide-react";

import {
  resolveTransactionActor,
  type Party,
  type TransactionLike,
} from "@/lib/status";
import { useStatusText } from "@/lib/i18n/status-text";
import { cn } from "@/lib/utils";

import { TONE_CHIP } from "./tone";

/**
 * Research risk R4 and design principle 1: "whose turn is it" is the most
 * asked question in any two-party flow, and it is answered first, at the top
 * of every transaction surface, in the second person when it is the viewer's
 * turn.
 *
 * The answer is derived entirely from columns the API already returns — no new
 * endpoint (docs/PLAN.md §1).
 */
export interface ActorLineProps {
  transaction: TransactionLike;
  viewer: Party;
  /** The primary action button for the viewer's turn, if any. */
  action?: React.ReactNode;
  className?: string;
}

export function ActorLine({
  transaction,
  viewer,
  action,
  className,
}: ActorLineProps) {
  const st = useStatusText();
  const prompt = resolveTransactionActor(transaction, viewer);
  const isYourTurn = prompt.actor === viewer;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center sm:justify-between",
        TONE_CHIP[prompt.tone],
        className,
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 text-body-lg leading-[1.5]",
          isYourTurn ? "font-semibold" : "font-medium",
        )}
      >
        {isYourTurn ? (
          <ArrowRight aria-hidden className="size-5 shrink-0" />
        ) : null}
        {st.key(prompt.labelKey)}
      </p>
      {isYourTurn && action ? (
        <div className="shrink-0">{action}</div>
      ) : null}
    </div>
  );
}
