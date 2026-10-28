import { Check } from "lucide-react";

import {
  requiresPayment,
  type AppointmentStatus,
  type Party,
  type TransactionLike,
  type TransactionStatus,
} from "@/lib/status";
import { cn } from "@/lib/utils";

import { TONE_CHIP, TONE_DOT } from "./tone";
import { isSlipRejected } from "@/lib/slip-state";

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

export function buildSteps(
  tx: TransactionLike,
  /** The Appointment_Card state, when a Meetup deal has one. */
  appointmentStatus?: AppointmentStatus,
): Step[] {
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

  if (pays) {
    raw.push({
      id: "pay",
      label: "Pay and upload the slip",
      actor: "buyer",
      // A rejected slip means the buyer has to pay-and-upload again.
      done: !!tx.payment_confirmed_by_buyer_at && !isSlipRejected(tx),
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
    // Flow 1 puts the appointment between the payment being confirmed and the
    // handover: one side proposes a date, time and place, the other accepts.
    // It is a real row in Appointment_Card with its own endpoint, which is why
    // it is a step — unlike the "meet up and inspect it" line it replaces,
    // which had nothing behind it and ticked itself off a payment.
    raw.push({
      id: "appointment",
      label: "Agree a time and place",
      actor: "both",
      done: appointmentStatus === "Confirmed" || isDone,
    });
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

const ROLE_LABEL: Record<Step["actor"], string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Both sides",
};

/**
 * "Buyer" and "Seller" are correct and useless: the reader has to work out
 * which one they are before the caption means anything. Once the viewer's side
 * is known, the caption can say "You" and name the other person instead.
 */
function actorLabel(
  actor: Step["actor"],
  viewer?: Party,
  counterpartyName?: string,
): string {
  if (!viewer) return ROLE_LABEL[actor];
  if (actor === "both") return "Both of you";
  if (actor === viewer) return "You";
  return counterpartyName ?? ROLE_LABEL[actor];
}

export interface TransactionStepperProps {
  transaction: TransactionLike;
  appointmentStatus?: AppointmentStatus;
  /**
   * `auto` keeps the responsive vertical-then-horizontal behaviour. The rail
   * pins it `vertical`, which used to need `!flex-col` overrides at the call
   * site fighting this component's own `md:flex-row`.
   */
  orientation?: "auto" | "vertical" | "horizontal";
  /** The viewer's side, so captions can say "You" instead of a bare role. */
  viewer?: Party;
  /** The other side, named. */
  counterpartyName?: string;
  className?: string;
}

/**
 * Vertical on mobile, horizontal from md up. A horizontal stepper at 360px
 * either truncates labels or scrolls sideways; both hide the one thing the
 * component exists to show.
 */
export function TransactionStepper({
  transaction,
  appointmentStatus,
  orientation = "auto",
  viewer,
  counterpartyName,
  className,
}: TransactionStepperProps) {
  const steps = buildSteps(transaction, appointmentStatus);
  const row = orientation === "horizontal";
  const responsive = orientation === "auto";

  return (
    <ol
      className={cn(
        "flex",
        row ? "flex-row gap-2" : "flex-col gap-0",
        responsive && "md:flex-row md:gap-2",
        className,
      )}
    >
      {steps.map((step, i) => {
        const actor = actorLabel(step.actor, viewer, counterpartyName);
        // Whose move it is, spelled out on the one step that is live. A column
        // of dots with a role caption never said "nothing happens until you
        // act", which is the only thing a stalled deal needs to communicate.
        const waitingOnYou = step.current && !!viewer && step.actor === viewer;
        const waitingLabel = !step.current
          ? null
          : step.actor === "both"
            ? "Waiting on both of you"
            : waitingOnYou
              ? "Waiting on you"
              : `Waiting on ${actor}`;

        return (
          <li
            key={step.id}
            aria-current={step.current ? "step" : undefined}
            className={cn(
              "relative flex flex-1 gap-3",
              row && "flex-col gap-2",
              responsive && "md:flex-col md:gap-2",
            )}
          >
            {/* Rail */}
            <div
              className={cn(
                "flex flex-col items-center",
                row && "w-full flex-row",
                responsive && "md:w-full md:flex-row",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-pill text-meta font-semibold",
                  "transition-colors duration-[--dur-base]",
                  step.done && cn(TONE_DOT.success, "text-white"),
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
                    "w-0.5 flex-1",
                    row && "h-0.5 w-full flex-1",
                    responsive && "md:h-0.5 md:w-full",
                    step.done ? TONE_DOT.success : "bg-gray-200",
                  )}
                />
              ) : null}
            </div>

            {/* Label */}
            <div className={cn("pb-5", row && "pb-0", responsive && "md:pb-0")}>
              <p
                className={cn(
                  "text-body-sm",
                  step.current ? "font-semibold text-ink" : "text-ink-secondary",
                  step.done && "text-ink-muted",
                )}
              >
                {step.label}
              </p>

              {/* Your own turn is not a warning. Amber says something has gone
                  wrong; the message here is "you are up", which is the brand's
                  job. And a solid fill on a step inside a stepper spends the
                  screen's one saturated element on a label (register.md §2) —
                  the action card below already carries the weight. */}
              {waitingLabel ? (
                <span
                  className={cn(
                    "mt-1 inline-flex items-center rounded-pill border px-2 py-0.5 text-meta font-medium",
                    waitingOnYou
                      ? "border-brand-subtle-hover bg-brand-subtle text-ink-brand"
                      : TONE_CHIP.neutral,
                  )}
                >
                  {waitingLabel}
                </span>
              ) : (
                <p className="text-meta leading-[1.4] text-ink-muted">
                  {actor}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
