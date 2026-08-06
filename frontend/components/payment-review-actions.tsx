"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DeliveryMethod } from "@/lib/trades";

/**
 * §4.2.4 — the seller confirms the money actually landed. This is the first of
 * the two confirmations in §2.4.2, and it is deliberately a human judgement:
 * the seller is expected to scan the QR printed on the slip with their own
 * banking app first (§4.1), which is the only fake-slip check that costs
 * nothing and the platform can't do for them.
 *
 * On confirm, §4.6.2 says the handover QR appears immediately with no extra
 * tap — so this navigates straight there rather than showing another button.
 */
export function PaymentReviewActions({
  tradeId,
  deliveryMethod,
}: {
  tradeId: string;
  deliveryMethod: DeliveryMethod;
}) {
  const router = useRouter();
  const [scannedSlip, setScannedSlip] = useState(false);

  function confirmReceipt() {
    // TODO: POST the confirmation and let the server stamp paymentConfirmedAt.
    router.push(
      deliveryMethod === "meetup"
        ? `/trade/${tradeId}/qr`
        : // TODO(phase 2): /trade/[id]/shipping once §4.3.1 exists.
          `/trade/${tradeId}/qr`
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4">
        <input
          type="checkbox"
          checked={scannedSlip}
          onChange={(event) => setScannedSlip(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--primary-dark)]"
        />
        <span className="text-xs leading-relaxed text-foreground">
          ฉันสแกน QR Code บนสลิปด้วยแอปธนาคารของตัวเองแล้ว
          และยอดเงินเข้าบัญชีจริง
        </span>
      </label>

      <Dialog>
        <DialogTrigger
          render={
            <Button
              disabled={!scannedSlip}
              className="h-12 w-full bg-primary-dark"
            />
          }
        >
          ยืนยันว่าได้รับเงินแล้ว
        </DialogTrigger>
        <DialogContent className="text-center">
          <DialogHeader className="items-center">
            <ScanLine className="size-9 text-primary-dark" />
            <DialogTitle className="text-lg">ยืนยันการรับเงิน?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            หลังยืนยัน ระบบจะแสดง QR Code สำหรับส่งมอบสินค้าให้ทันที
            ธุรกรรมยังอยู่ในสถานะ Processing จนกว่าผู้ซื้อจะสแกนยืนยันรับของ
          </p>
          <Button onClick={confirmReceipt} className="h-12 w-full bg-primary-dark">
            ยืนยัน
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
