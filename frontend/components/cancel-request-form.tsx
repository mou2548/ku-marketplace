"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/**
 * §4.7 — asking to cancel a Processing trade.
 *
 * The request does two things at once: it records who asked, and it freezes
 * both confirm buttons so the deal cannot slip into Completed while the
 * question is open. It does NOT cancel anything on its own — money may already
 * have moved, so only the other side's consent (or an admin) can end it.
 */
export function CancelRequestForm({ tradeId }: { tradeId: string }) {
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <Card className="w-full flex-col items-center gap-4 rounded-3xl p-8 text-center shadow-card ring-0">
        <div className="flex size-14 items-center justify-center rounded-full bg-warning-bg">
          <Clock className="size-7 text-warning-dark" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">
            ส่งคำขอยกเลิกแล้ว
          </h2>
          <p className="text-sm text-muted-foreground">
            รอให้อีกฝ่ายตอบรับหรือปฏิเสธ
            ระหว่างนี้ปุ่มยืนยันรับเงินและยืนยันรับสินค้าถูกล็อกไว้ทั้งคู่
          </p>
        </div>
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
          ถ้าอีกฝ่ายปฏิเสธหรือไม่ตอบภายในกรอบเวลา
          ระบบจะไม่ยกเลิกให้อัตโนมัติ แต่จะส่งเรื่องให้แอดมินตรวจสอบแทน
        </p>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/history"
            className="flex h-12 w-full items-center justify-center rounded-full bg-primary-dark text-sm font-medium text-white"
          >
            กลับไปหน้าประวัติธุรกรรม
          </Link>
          {/* No backend to push this to the other party's device. */}
          <Link
            href={`/trade/${tradeId}/cancel/respond`}
            className="text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            [เดโม่] เปิดหน้าฝั่งที่ต้องตอบคำขอ
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-foreground">
          ขอยกเลิกธุรกรรม
        </h2>
        <p className="text-sm text-muted-foreground">
          ธุรกรรมอยู่ในสถานะ Processing แล้ว
          การยกเลิกจึงต้องได้รับความยินยอมจากอีกฝ่าย
        </p>
      </div>

      <div className="flex gap-3 rounded-2xl bg-warning-bg p-4">
        <Lock className="size-5 shrink-0 text-warning-dark" />
        <p className="text-xs leading-relaxed text-foreground">
          เมื่อส่งคำขอ ปุ่มยืนยันรับเงินและยืนยันรับสินค้าจะถูกล็อกทั้งสองฝ่าย
          จนกว่าคำขอจะได้ข้อสรุป เพื่อไม่ให้ธุรกรรมเดินไปถึง Completed
          ระหว่างที่ยังตกลงกันไม่ได้
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="cancel-reason" className="text-sm font-semibold">
          เหตุผล (ส่งให้อีกฝ่ายและแอดมินเห็น)
        </label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="เช่น ตกลงกันแล้วว่าจะยกเลิกและคืนเงินให้เรียบร้อย"
          className="min-h-28 rounded-2xl bg-surface-muted"
        />
      </div>

      {/* §4.7 — the platform has no refund mechanism; it never touched the
          money (§8.1). Saying so here prevents the expectation. */}
      <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
        หากโอนเงินไปแล้ว ต้องตกลงเรื่องการคืนเงินกันเอง
        ระบบไม่มีกลไกคืนเงินและไม่เคยถือเงินของคุณ
        หากอีกฝ่ายไม่คืนตามที่ตกลง ให้ใช้ระบบรายงาน
      </p>

      {/* TODO: POST the cancel request; the server records requestedBy and
          locks both confirmations. */}
      <Button
        disabled={reason.trim().length < 10}
        onClick={() => setSubmitted(true)}
        className="h-12 w-full bg-error hover:bg-error/90"
      >
        ส่งคำขอยกเลิก
      </Button>

      <Link
        href="/history"
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        ดำเนินธุรกรรมต่อ
      </Link>
    </Card>
  );
}
