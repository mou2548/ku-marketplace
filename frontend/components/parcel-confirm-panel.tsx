"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * §4.3.3 — the confirm-received control, kept behind its own screen and a
 * second acknowledgement because pressing it closes the trade permanently.
 * The checkbox is not decoration: it forces the "have you actually opened the
 * parcel" question to be answered before the button is live.
 */
export function ParcelConfirmPanel({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex w-full flex-col gap-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--primary-dark)]"
        />
        <span className="text-xs leading-relaxed text-foreground">
          ฉันได้รับพัสดุ เปิดตรวจสอบสินค้าแล้ว
          และสินค้าตรงตามคำอธิบายในโพสต์
        </span>
      </label>

      {!confirming ? (
        <Button
          disabled={!acknowledged}
          onClick={() => setConfirming(true)}
          className="h-12 w-full gap-2 bg-primary-dark"
        >
          <PackageCheck className="size-4" />
          ยืนยันว่าได้รับพัสดุแล้ว
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-error/30 bg-error-bg p-4">
          <p className="text-sm font-semibold text-foreground">
            ยืนยันครั้งสุดท้าย
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            การกดยืนยันจะปิดธุรกรรมนี้ถาวรทันที
            สินค้าจะเปลี่ยนเป็นสถานะโอนเจ้าของแล้วและย้อนกลับไม่ได้
            หากสินค้ามีปัญหา ให้กดรายงานแทนการยืนยัน
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              className="h-12 flex-1 bg-white"
            >
              ย้อนกลับ
            </Button>
            {/* TODO: POST the confirmation; the server stamps
                handoverConfirmedAt and closes the trade (§2.4.3). */}
            <Button
              onClick={() => router.push(`/trade/${tradeId}/success`)}
              className="h-12 flex-1 bg-primary-dark"
            >
              ยืนยันปิดธุรกรรม
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
