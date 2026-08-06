"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * §4.6.5 — scanning must NOT change anything on its own. The scan opens this
 * page; a second, deliberate press is what completes the handover. Guards
 * against a mis-scan, and against someone scanning a screenshot that leaked.
 */
export function ScanConfirmPanel({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex w-full flex-col gap-3">
      {!confirming ? (
        <Button
          onClick={() => setConfirming(true)}
          className="h-12 w-full gap-2 bg-primary-dark"
        >
          <PackageCheck className="size-4" />
          ยืนยันว่าได้รับสินค้าแล้ว
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4">
          <p className="text-sm font-medium text-foreground">
            ยืนยันว่าได้รับสินค้าครบถ้วนตามที่ตกลง?
          </p>
          <p className="text-xs text-muted-foreground">
            เมื่อยืนยันแล้วธุรกรรมจะเสร็จสมบูรณ์ทันทีและย้อนกลับไม่ได้
            สินค้าจะเปลี่ยนเป็นสถานะโอนเจ้าของแล้ว
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              className="h-12 flex-1 bg-white"
            >
              ย้อนกลับ
            </Button>
            {/* TODO: POST the handover confirmation; the server stamps
                handoverConfirmedAt, flips the trade to Completed once payment
                is confirmed too (§2.4.3), and marks the item Transferred. */}
            <Button
              onClick={() => router.push(`/trade/${tradeId}/success`)}
              className="h-12 flex-1 bg-primary-dark"
            >
              ยืนยัน
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
