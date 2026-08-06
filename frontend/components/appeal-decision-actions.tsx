"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * §7.4 — ruling on an appeal. Two outcomes only: keep the original decision or
 * reverse it. The second reviewer is not asked to invent a new punishment,
 * they are asked whether the first one holds.
 */
export function AppealDecisionActions({ appealId }: { appealId: string }) {
  const router = useRouter();
  const [choice, setChoice] = useState<"uphold" | "overturn" | null>(null);

  if (choice) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4">
        <span className="text-sm font-semibold text-foreground">
          {choice === "uphold" ? "ยืนตามผลเดิม?" : "กลับคำตัดสิน?"}
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {choice === "uphold"
            ? "บทลงโทษเดิมยังมีผลต่อไป และผู้ยื่นอุทธรณ์จะได้รับแจ้งผล"
            : "บทลงโทษเดิมถูกยกเลิก บัญชีกลับมาใช้งานได้ตามปกติ และกู้คืนโพสต์ที่ถูกระงับ"}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setChoice(null)}
            className="h-12 flex-1 bg-white"
          >
            ย้อนกลับ
          </Button>
          {/* TODO: POST the appeal decision; the server records which admin
              ruled and notifies the appellant. */}
          <Button
            onClick={() => router.push(`/admin/appeals?decided=${appealId}`)}
            className="h-12 flex-1 bg-primary-dark"
          >
            ยืนยัน
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        variant="outline"
        onClick={() => setChoice("overturn")}
        className="h-12 flex-1 bg-white"
      >
        กลับคำตัดสิน
      </Button>
      <Button
        onClick={() => setChoice("uphold")}
        className="h-12 flex-1 bg-primary-dark"
      >
        ยืนตามผลเดิม
      </Button>
    </div>
  );
}
