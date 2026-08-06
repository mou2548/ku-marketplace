"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * §4.7 — the other side's answer to a cancel request.
 *
 * Accept ends the trade and unlocks the items back to their previous status
 * (§2.4.4). Refusing does NOT keep the deal running quietly: it hands the
 * disagreement to an admin as a dispute (§2.5), and the confirm buttons stay
 * frozen until that is decided. Doing nothing has the same effect as refusing
 * — §4.5 forbids silence from being read as consent.
 */
export function CancelRespondActions({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [choice, setChoice] = useState<"accept" | "reject" | null>(null);

  if (choice === "accept") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4 text-left">
        <p className="text-sm font-semibold text-foreground">
          ยืนยันยกเลิกธุรกรรมนี้?
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          สินค้าที่ผูกอยู่จะปลดล็อกกลับสู่สถานะเดิม
          และธุรกรรมจะเข้าสู่สถานะ Cancelled ซึ่งเป็นสถานะสิ้นสุด
          หากมีการโอนเงินไปแล้ว ต้องตกลงเรื่องคืนเงินกันเอง
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setChoice(null)}
            className="h-12 flex-1 bg-white"
          >
            ย้อนกลับ
          </Button>
          {/* TODO: POST the acceptance; the server sets Cancelled and unlocks
              every item bound to the trade. */}
          <Button
            onClick={() => router.push(`/history?trade=${tradeId}`)}
            className="h-12 flex-1 bg-error hover:bg-error/90"
          >
            ยินยอมยกเลิก
          </Button>
        </div>
      </div>
    );
  }

  if (choice === "reject") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning-bg p-4 text-left">
        <p className="text-sm font-semibold text-foreground">
          ปฏิเสธคำขอยกเลิก?
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          ธุรกรรมจะไม่ถูกยกเลิก แต่เรื่องจะถูกส่งให้แอดมินตรวจสอบ
          และปุ่มยืนยันทั้งสองฝ่ายยังคงถูกล็อกไว้จนกว่าแอดมินจะตัดสิน
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setChoice(null)}
            className="h-12 flex-1 bg-white"
          >
            ย้อนกลับ
          </Button>
          {/* TODO: POST the refusal; the server flips dispute to under-review
              and keeps both confirmations locked. */}
          <Button
            onClick={() => router.push(`/history?trade=${tradeId}`)}
            className="h-12 flex-1 bg-primary-dark"
          >
            ยืนยันการปฏิเสธ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row">
      <Button
        variant="outline"
        onClick={() => setChoice("reject")}
        className="h-12 flex-1 bg-white"
      >
        ไม่ยินยอม
      </Button>
      <Button
        onClick={() => setChoice("accept")}
        className="h-12 flex-1 bg-error hover:bg-error/90"
      >
        ยินยอมยกเลิก
      </Button>
    </div>
  );
}
