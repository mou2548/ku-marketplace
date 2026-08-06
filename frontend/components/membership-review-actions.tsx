"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * §8 revenue 1 — approving a membership slip.
 *
 * Manual on purpose: the subscription is paid by direct PromptPay transfer, so
 * there is no processor callback to trust. An admin compares the slip against
 * the team account and approves, which is also what catches wrong amounts.
 */
export function MembershipReviewActions({
  requestId,
  amountMatches,
}: {
  requestId: string;
  amountMatches: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4">
        <span className="text-sm font-semibold text-foreground">
          {confirming === "approve" ? "อนุมัติสมาชิก?" : "ปฏิเสธคำขอ?"}
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {confirming === "approve"
            ? "สิทธิ์เริ่มทำงานทันทีและหมดอายุอัตโนมัติเมื่อครบหนึ่งเดือน โควตาโพสต์เพิ่มเป็น 20 รายการ"
            : "ผู้ใช้จะได้รับแจ้งพร้อมเหตุผล และยื่นสลิปใหม่ได้"}
        </p>
        {confirming === "approve" && !amountMatches && (
          <p className="rounded-xl bg-error-bg px-3 py-2 text-xs text-error">
            ยอดเงินในสลิปไม่ตรงกับค่าสมาชิก ตรวจสอบอีกครั้งก่อนอนุมัติ
          </p>
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirming(null)}
            className="h-11 flex-1 bg-white"
          >
            ย้อนกลับ
          </Button>
          {/* TODO: POST the decision; the server activates or rejects the
              membership and notifies the user. */}
          <Button
            onClick={() => router.push(`/admin/memberships?done=${requestId}`)}
            className={
              confirming === "approve"
                ? "h-11 flex-1 bg-primary-dark"
                : "h-11 flex-1 bg-error hover:bg-error/90"
            }
          >
            ยืนยัน
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button
        variant="outline"
        onClick={() => setConfirming("reject")}
        className="h-11 flex-1 gap-2 border-error bg-white text-error hover:bg-error/5"
      >
        <X className="size-4" />
        ปฏิเสธ
      </Button>
      <Button
        onClick={() => setConfirming("approve")}
        className="h-11 flex-1 gap-2 bg-primary-dark"
      >
        <Check className="size-4" />
        อนุมัติ
      </Button>
    </div>
  );
}
