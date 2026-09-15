"use client";

import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { QrTicket } from "@/components/kit/qr-ticket";
import { createHandoverToken } from "@/lib/actions/transactions";

export function DealQr({
  transactionId,
  itemName,
}: {
  transactionId: number;
  itemName: string;
}) {
  // The token was fabricated client-side — `ku-tx-{id}-{Date.now()}` — so the
  // buyer's scanner had nothing to verify it against and the handover, which
  // PRODUCT.md calls the moment the product exists for, closed no deal.
  const generate = useCallback(
    () => createHandoverToken(transactionId),
    [transactionId],
  );

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <LinkButton
        variant="ghost"
        size="sm"
        href={`/history/${transactionId}`}
        className="self-start"
      >
        <ArrowLeft className="size-4" />
        Back to the chat
      </LinkButton>

      <div className="text-center">
        <h1 className="text-[1.25rem] leading-[1.3] font-semibold">
          Let the buyer scan to close the deal
        </h1>
        <p className="mt-1 text-body-sm text-ink-muted">{itemName}</p>
      </div>

      <QrTicket
        once
        onGenerate={generate}
        ariaLabel={`QR code for handing over ${itemName}`}
        caption="One code per 15 minutes. Hand the item over before letting them scan — scanning closes the deal immediately and cannot be undone."
      />
    </div>
  );
}
