import { Check } from "lucide-react";

import {
  requiresPayment,
  type TransactionLike,
  type TransactionStatus,
} from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Research risk R3: flow 1 has four terminal paths — Shipping, Meetup, trade
 * with a cash top-up, trade without one — and the old UI showed all of them at
 * once across twelve routes. Principle 5: once a delivery method is chosen the
 * UI commits to that path and shows only its steps.
 *
 * Steps are derived, never stored: the schema's timestamp columns already say
 * exactly how far a deal has progressed.
 */

export interface Step {
  id: string;
  label: string;
  /** Who performs it — rendered as a caption so R4 is answered per step. */
  actor: "buyer" | "seller" | "both";
  done: boolean;
  current: boolean;
}

export function buildSteps(tx: TransactionLike): Step[] {
  const terminal: TransactionStatus[] = ["Completed", "Cancelled", "Refunded"];
  const isDone = terminal.includes(tx.status);
  const pays = requiresPayment(tx);

  const raw: Array<Omit<Step, "current">> = [];

  raw.push({
    id: "agree",
    label: pays ? "Deal agreed" : "Trade agreed",
    actor: "both",
    done: true,
  });

  // Meetup inspects before paying. Flow 1 is explicit: the buyer looks at the
  // item, then transfers, then uploads a slip, then the seller confirms, then
  // the buyer scans. An earlier version put the meetup fourth, after the money
  // had already moved, which inverted the one protection a meetup gives you.
  if (tx.delivery_method === "Meetup") {
    raw.push({
      id: "meet",
      label: "Meet up and inspect the item",
      actor: "both",
      done: pays
        ? !!tx.payment_confirmed_by_buyer_at
        : !!tx.item_received_confirmed_by_buyer_at || isDone,
    });
  }

  if (pays) {
    raw.push({
      id: "pay",
      label: "Pay and upload the slip",
      actor: "buyer",
      done: !!tx.payment_confirmed_by_buyer_at,
    });
    raw.push({
      id: "confirm-pay",
      label: "Seller checks the slip",
      actor: "seller",
      done: !!tx.payment_confirmed_by_seller_at,
    });
  }

  if (tx.delivery_method === "Shipping") {
    raw.push({
      id: "ship",
      label: "Enter the tracking number",
      actor: "seller",
      done: !!tx.tracking_number,
    });
    raw.push({
      id: "receive",
      label: "Confirm the item arrived",
      actor: "buyer",
      done: !!tx.item_received_confirmed_by_buyer_at || isDone,
    });
  } else {
    raw.push({
      id: "scan",
      label: "Scan the QR to confirm handover",
      actor: "buyer",
      done: isDone,
    });
  }

  const firstPending = raw.findIndex((s) => !s.done);
  return raw.map((s, i) => ({ ...s, current: i === firstPending }));
}

const ACTOR_LABEL: Record<Step["actor"], string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Both sides",
};

export interface TransactionStepperProps {
  transaction: TransactionLike;
  className?: string;
}

/**
 * Vertical on mobile, horizontal from md up. A horizontal stepper at 360px
 * either truncates labels or scrolls sideways; both hide the one thing the
 * component exists to show.
 */
export function TransactionStepper({
  transaction,
  className,
}: TransactionStepperProps) {
  const steps = buildSteps(transaction);

  return (
    <ol
      className={cn(
        "flex flex-col gap-0 md:flex-row md:gap-2",
        className,
      )}
    >
      {steps.map((step, i) => (
        <li
          key={step.id}
          aria-current={step.current ? "step" : undefined}
          className="relative flex flex-1 gap-3 md:flex-col md:gap-2"
        >
          {/* Rail */}
          <div className="flex flex-col items-center md:w-full md:flex-row">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-pill text-[0.75rem] font-semibold",
                "transition-colors duration-[--dur-base]",
                step.done && "bg-tone-success-solid text-white",
                step.current && !step.done && "bg-brand text-on-brand shadow-raised",
                !step.done && !step.current && "bg-gray-200 text-ink-muted",
              )}
            >
              {step.done ? <Check aria-hidden className="size-4" /> : i + 1}
            </span>
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "w-0.5 flex-1 md:h-0.5 md:w-full",
                  step.done ? "bg-tone-success-solid" : "bg-gray-200",
                )}
              />
            ) : null}
          </div>

          {/* Label */}
          <div className="pb-5 md:pb-0">
            <p
              className={cn(
                "text-[0.875rem] leading-[1.65]",
                step.current ? "font-semibold text-ink" : "text-ink-secondary",
                step.done && "text-ink-muted",
              )}
            >
              {step.label}
            </p>
            <p className="text-[0.75rem] leading-[1.4] text-ink-muted">
              {ACTOR_LABEL[step.actor]}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
