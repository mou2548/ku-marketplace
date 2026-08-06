"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** §7.4 — an appeal needs a reason; "I disagree" is not reviewable. */
const MIN_REASON_LENGTH = 20;

export function AppealForm({ reportId }: { reportId: string }) {
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <Card className="flex-col items-center gap-4 rounded-3xl p-8 text-center shadow-card ring-0">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary-light">
          <CheckCircle2 className="size-7 text-primary-dark" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">
            ส่งคำอุทธรณ์แล้ว
          </h2>
          <p className="text-sm text-muted-foreground">
            แอดมินคนอื่นซึ่งไม่ใช่ผู้ตัดสินเรื่องนี้ในครั้งแรก
            จะเป็นผู้พิจารณาว่าจะยืนตามผลเดิมหรือกลับคำตัดสิน
          </p>
        </div>
        <Link
          href="/account"
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary-dark text-sm font-medium text-white"
        >
          กลับไปหน้าบัญชี
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
      <div className="flex flex-col gap-2">
        <Label htmlFor="appeal-reason" className="text-sm font-semibold">
          เหตุผลในการอุทธรณ์
        </Label>
        <Textarea
          id="appeal-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="อธิบายว่าคำตัดสินคลาดเคลื่อนตรงไหน และมีหลักฐานอะไรที่ยังไม่ได้ถูกพิจารณา"
          className="min-h-32 rounded-2xl bg-surface-muted"
        />
        <p className="text-xs text-muted-foreground">
          อย่างน้อย {MIN_REASON_LENGTH} ตัวอักษร ({reason.trim().length}/
          {MIN_REASON_LENGTH})
        </p>
      </div>

      {/* TODO: POST the appeal against reportId; the server routes it to an
          admin other than the original decision-maker (§7.4). */}
      <Button
        disabled={reason.trim().length < MIN_REASON_LENGTH}
        onClick={() => setSubmitted(true)}
        className="h-12 w-full bg-primary-dark"
      >
        ส่งคำอุทธรณ์
      </Button>

      <Link
        href={`/history?report=${reportId}`}
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        ยกเลิก
      </Link>
    </Card>
  );
}
