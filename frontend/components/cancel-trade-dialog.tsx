"use client";

import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * The cancel dialog, in its two shapes.
 *
 * `mutual` is the §4.7 case: once a trade is Processing, money may already
 * have changed hands, so one party pressing a button cannot end it. The dialog
 * then stops being a confirmation and becomes a hand-off to the request flow.
 * Pending trades keep the plain one-sided confirm (§2.4.1).
 */
export function CancelTradeDialog({
  tradeId,
  mutual,
  asModal = false,
}: {
  tradeId: string;
  mutual: boolean;
  asModal?: boolean;
}) {
  const router = useRouter();

  // DialogTitle needs a Dialog root above it (base-ui reads context), so the
  // standalone page variant has to render a plain heading instead.
  const Title = asModal ? DialogTitle : "h1";

  const body = mutual ? (
    <>
      <div className="flex size-14 items-center justify-center rounded-full bg-warning-bg">
        <Users className="size-7 text-warning-dark" />
      </div>

      <div className="flex flex-col gap-2">
        <Title className="text-xl font-semibold text-foreground">
          ยกเลิกฝ่ายเดียวไม่ได้
        </Title>
        <p className="text-sm text-muted-foreground">
          ธุรกรรมนี้อยู่ในสถานะ Processing แล้ว
          เพราะอาจมีการโอนเงินเกิดขึ้นจริง การยกเลิกจึงต้องได้รับความยินยอมจากทั้งสองฝ่าย
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button
          onClick={() => router.push(`/trade/${tradeId}/cancel/request`)}
          className="h-12 w-full bg-primary-dark"
        >
          ส่งคำขอยกเลิกให้อีกฝ่าย
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="h-12 w-full"
        >
          ดำเนินธุรกรรมต่อ
        </Button>
      </div>
    </>
  ) : (
    <>
      <div className="flex size-14 items-center justify-center rounded-full bg-error-bg">
        <X className="size-7 text-error" />
      </div>

      <div className="flex flex-col gap-2">
        <Title className="text-xl font-semibold text-foreground">
          ยกเลิกธุรกรรมนี้?
        </Title>
        <p className="text-sm text-muted-foreground">
          ยังไม่มีการโอนเงินเกิดขึ้น คุณจึงยกเลิกได้ทันทีโดยไม่ต้องขอความยินยอม
          สินค้าที่ผูกอยู่จะปลดล็อกกลับสู่สถานะเดิม
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {/* TODO: POST the cancellation; the server sets Cancelled and unlocks
            every item bound to the trade (§2.4.4). */}
        <Button
          onClick={() => router.push("/history")}
          className="h-12 w-full bg-error hover:bg-error/90"
        >
          ยืนยันการยกเลิก
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="h-12 w-full"
        >
          เก็บธุรกรรมไว้
        </Button>
      </div>
    </>
  );

  if (!asModal) {
    return (
      <div className="flex w-full max-w-[440px] flex-col items-center gap-6 rounded-3xl border border-border/30 bg-white p-8 text-center shadow-elevated">
        {body}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[440px] items-center gap-6 rounded-3xl p-8 text-center"
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}
