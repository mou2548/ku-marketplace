"use client";

import { useState } from "react";
import Link from "next/link";
import { CloudUpload, Clock, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * §4.1 / §4.2.2 — the buyer attaches proof of a transfer they made directly to
 * the seller and presses confirm. That press is what moves the trade from
 * Pending to Processing, and it is the last moment either side can walk away
 * alone (§2.4.1) — hence the confirm dialog.
 */
export function SlipUploadForm({ tradeId }: { tradeId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <Card className="w-full flex-col items-center gap-4 rounded-3xl p-8 text-center shadow-card ring-0">
        <div className="flex size-14 items-center justify-center rounded-full bg-warning-bg">
          <Clock className="size-7 text-warning-dark" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">
            รอผู้ขายยืนยันรับเงิน
          </h2>
          <p className="text-sm text-muted-foreground">
            ธุรกรรมเข้าสู่สถานะ Processing แล้ว
            ตั้งแต่นี้การยกเลิกต้องได้รับความยินยอมจากทั้งสองฝ่าย
          </p>
        </div>
        {/* §4.5 — if the seller sits on it, the buyer gets nudged at 3 hours and
            may report at 24. The system never confirms on their behalf. */}
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
          ถ้าเกิน 24 ชั่วโมงแล้วผู้ขายยังไม่กดยืนยัน คุณรายงานให้แอดมินตรวจสอบได้
        </p>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/chat"
            className="flex h-12 w-full items-center justify-center rounded-full bg-primary-dark text-sm font-medium text-white"
          >
            ไปที่ห้องแชท
          </Link>
          {/* No backend to flip the seller's screen, so this stands in for the
              push notification that would take them to the review page. */}
          <Link
            href={`/trade/${tradeId}/payment/review`}
            className="text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            [เดโม่] เปิดหน้าฝั่งผู้ขาย
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Step 1 — แนบสลิป
        </span>
        <h2 className="text-xl font-semibold text-foreground">
          อัปโหลดหลักฐานการโอนเงิน
        </h2>
      </div>

      {/* §8.1 — the platform is never in the money path. Say so where the user
          is about to transfer, not buried in terms. */}
      <div className="flex gap-3 rounded-2xl bg-warning-bg p-4">
        <ShieldAlert className="size-5 shrink-0 text-warning-dark" />
        <p className="text-xs leading-relaxed text-foreground">
          โอนเงินให้ผู้ขายโดยตรง แพลตฟอร์มไม่รับฝากเงินและไม่เป็นตัวกลางทางการเงิน
          ระบบเก็บสลิปไว้เป็นหลักฐานสำหรับตรวจสอบย้อนหลังเท่านั้น
        </p>
      </div>

      <label className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center transition-colors hover:border-primary">
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <CloudUpload className="size-6 text-primary-dark" />
        <span className="text-sm font-semibold text-primary-dark">
          {file ? file.name : "แนบสลิปโอนเงิน"}
        </span>
        {!file && (
          <span className="text-xs text-muted-foreground">
            PNG หรือ JPG — ต้องเห็น QR Code บนสลิปชัดเจน
          </span>
        )}
      </label>

      <Dialog>
        <DialogTrigger
          render={
            <Button disabled={!file} className="h-12 w-full bg-primary-dark" />
          }
        >
          ยืนยันว่าโอนเงินแล้ว
        </DialogTrigger>
        <DialogContent className="text-center">
          <DialogHeader className="items-center">
            <DialogTitle className="text-lg">ยืนยันว่าโอนเงินแล้ว?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            หลังกดยืนยัน ธุรกรรมจะเข้าสู่สถานะ Processing
            และการยกเลิกหลังจากนี้ต้องได้รับความยินยอมจากทั้งสองฝ่าย
          </p>
          <div className="flex flex-col gap-2">
            {/* TODO: POST the slip + confirmation, then let the server flip
                status to processing and stamp slipUploadedAt. */}
            <Button
              onClick={() => setSubmitted(true)}
              className="h-12 w-full bg-primary-dark"
            >
              ยืนยัน
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
