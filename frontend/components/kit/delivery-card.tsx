"use client";

import { useState } from "react";
import { Check, Copy, PackageCheck, Truck } from "lucide-react";

import type { Transaction } from "@/lib/api/types";
import { shippingDeadline } from "@/lib/status";
import { cn } from "@/lib/utils";

import { CountdownPill } from "./countdown-pill";
import { Surface } from "./surface";

/**
 * What a shipping deal has instead of a meetup.
 *
 * A shipped deal has no appointment, so pinning "Meetup 10 Aug, 13:00" above it
 * was showing information that does not exist. What both sides actually want to
 * know is the same thing — when does the parcel land — so both sides see the
 * same card, and only the sentence about whose move it is differs.
 */
export function DeliveryCard({
  transaction,
  viewer,
  compact = false,
  className,
}: {
  transaction: Transaction;
  viewer: "buyer" | "seller";
  /** One line, for the pinned strip. */
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const tracking = transaction.tracking_number;
  const eta = transaction.estimated_delivery_date;

  const etaLabel = eta
    ? new Date(eta).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : null;

  const headline = !tracking
    ? viewer === "seller"
      ? "Not sent yet — enter the tracking number"
      : "Not sent yet — waiting on the seller"
    : etaLabel
      ? `Arriving around ${etaLabel}`
      : "On its way";

  async function copy() {
    if (!tracking) return;
    await navigator.clipboard.writeText(tracking);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (compact) {
    return (
      <span className={cn("flex min-w-0 items-center gap-2", className)}>
        <Truck aria-hidden className="size-4 shrink-0 text-tone-info-fg" />
        <span className="min-w-0 flex-1 truncate font-medium text-tone-info-fg">
          {headline}
          {tracking ? ` · ${tracking}` : ""}
        </span>
      </span>
    );
  }

  return (
    <Surface
      shape="card"
      elevation="flat"
      className={cn("flex flex-col gap-3 bg-tone-info-bg p-4", className)}
    >
      <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-tone-info-fg">
        {tracking ? (
          <PackageCheck aria-hidden className="size-4 shrink-0" />
        ) : (
          <Truck aria-hidden className="size-4 shrink-0" />
        )}
        {headline}
      </p>

      {tracking ? (
        <div className="flex items-center gap-2">
          <span
            data-numeric
            className="min-w-0 flex-1 truncate rounded-control bg-surface px-3 py-2 text-[0.875rem] font-medium shadow-sunken"
          >
            {tracking}
          </span>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy the tracking number"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-surface text-ink-secondary shadow-raised hover:text-ink"
          >
            {copied ? (
              <Check aria-hidden className="size-4 text-brand" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
          </button>
        </div>
      ) : null}

      {/* The +3 day grace period from flow 1, visible before it matters rather
          than as a surprise when the report button appears. */}
      {eta ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[0.75rem] text-ink-muted">
            You can report a problem after this
          </p>
          <CountdownPill deadline={shippingDeadline(eta)} />
        </div>
      ) : null}

      <p className="text-[0.8125rem] leading-[1.6] text-ink-secondary">
        {viewer === "buyer"
          ? "Confirm once it arrives and matches what was agreed. That closes the deal."
          : "The buyer confirms when it arrives. Nothing else is needed from you."}
      </p>
    </Surface>
  );
}
