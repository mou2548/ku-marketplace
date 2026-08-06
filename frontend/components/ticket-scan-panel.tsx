"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * §4.6.5 — the giver's second, deliberate press. Scanning alone must not mark
 * an item as collected: a mis-scan, or a screenshot of the ticket that leaked
 * to someone else, would otherwise burn the recipient's slot.
 */
export function TicketScanPanel({
  ticketId,
  holderName,
}: {
  ticketId: string;
  holderName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4 text-left">
        <p className="text-sm font-semibold text-foreground">
          ยืนยันว่าส่งมอบของให้ {holderName} แล้ว?
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          สถานะตั๋วจะเปลี่ยนเป็น &ldquo;รับแล้ว&rdquo; และย้อนกลับไม่ได้
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirming(false)}
            className="h-12 flex-1 bg-white"
          >
            ย้อนกลับ
          </Button>
          {/* TODO: POST the pickup confirmation and burn the token (§4.6.1). */}
          <Button
            onClick={() => router.push(`/giveaway/manager?collected=${ticketId}`)}
            className="h-12 flex-1 bg-primary-dark"
          >
            ยืนยันการรับของ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setConfirming(true)}
      className="h-12 w-full gap-2 bg-primary-dark"
    >
      <HandCoins className="size-4" />
      ยืนยันการรับของ
    </Button>
  );
}
