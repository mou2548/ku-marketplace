"use client";

import { formatDate } from "@/lib/date-format";


import { getCopy } from "@/lib/copy";
import { useState } from "react";
import { Check, Copy, PackageCheck, Truck } from "lucide-react";

import type { Transaction } from "@/lib/api/types";
import { shippingDeadline } from "@/lib/status";
import { cn } from "@/lib/utils";

import { Notice } from "@/components/patterns/notice";

import { CountdownPill } from "./countdown-pill";

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
  const t = getCopy();
  const [copied, setCopied] = useState(false);
  const tracking = transaction.tracking_number;
  const eta = transaction.estimated_delivery_date;

  const etaLabel = eta
    ? formatDate(new Date(eta))
    : null;
  const receivedAt = transaction.item_received_confirmed_by_buyer_at;
  // A finished deal has nothing left to wait for: no report countdown (it
  // read "Past due" on every completed deal) and no "confirm once it
  // arrives". Every status is listed so a new one is a compile error here.
  const isOver = ((status: Transaction["status"]): boolean => {
    switch (status) {
      case "Pending":
      case "Processing":
        return false;
      case "Completed":
      case "Cancelled":
      case "Refunded":
      case "Pending Refund":
        return true;
      default: {
        const unhandled: never = status;
        return unhandled;
      }
    }
  })(transaction.status);

  const headline = receivedAt
    ? `Delivered ${formatDate(new Date(receivedAt))}`
    : isOver
      ? tracking
        ? "Shipped"
        : "Never shipped"
      : !tracking
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
    <Notice tone="info" className={cn("flex flex-col gap-3", className)}
    >
      <p className="flex items-center gap-2 text-body font-semibold text-tone-info-fg">
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
            className="min-w-0 flex-1 truncate rounded-control bg-surface px-3 py-2 text-body-sm font-medium shadow-sunken"
          >
            {tracking}
          </span>
          <button
            type="button"
            onClick={copy}
            aria-label={t("delivery.copyTracking")}
            className="touch-target grid size-9 shrink-0 place-items-center rounded-control bg-surface text-ink-secondary shadow-raised hover:text-ink"
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
      {eta && !isOver ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-meta text-ink-muted">{t("delivery.reportAfter")}</p>
          <CountdownPill deadline={shippingDeadline(eta)} />
        </div>
      ) : null}

      {isOver ? null : (
        <p className="text-caption leading-[1.6] text-ink-secondary">
          {viewer === "buyer"
            ? "Confirm once it arrives and matches what was agreed. That closes the deal."
            : "The buyer confirms when it arrives. Nothing else is needed from you."}
        </p>
      )}
    </Notice>
  );
}
