"use client";

import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { QrTicket } from "@/components/kit/qr-ticket";

export function DealQr({
  transactionId,
  itemName,
}: {
  transactionId: number;
  itemName: string;
}) {
  // POST /transactions/{id}/qr/generate
  const generate = useCallback(
    async () => `ku-tx-${transactionId}-${Date.now()}`,
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
        <p className="mt-1 text-[0.875rem] text-ink-muted">{itemName}</p>
      </div>

      <QrTicket
        onGenerate={generate}
        caption="Hand the item over before letting them scan. Scanning closes the deal immediately and cannot be undone."
      />
    </div>
  );
}
