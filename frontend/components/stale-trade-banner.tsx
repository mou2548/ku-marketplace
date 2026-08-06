import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { STALE_THRESHOLDS, staleLevel, tradeStage, type Trade } from "@/lib/trades";
import { cn } from "@/lib/utils";

/**
 * §4.5 — what a stalled step is allowed to produce.
 *
 * The proposal is explicit that the system never confirms on a user's behalf
 * when the other side goes quiet: it cannot know whether the awaited event
 * actually happened, so letting a timer advance the status would be asserting
 * something untrue. All that is permitted is a reminder and, later, the right
 * to ask an admin to look (§7).
 */
export function StaleTradeBanner({ trade }: { trade: Trade }) {
  const stage = tradeStage(trade);

  const step =
    stage === "awaiting-payment-confirmation"
      ? "paymentConfirmation"
      : stage === "awaiting-parcel-confirmation"
        ? "handoverConfirmation"
        : null;

  if (!step) return null;

  const startedAt =
    step === "paymentConfirmation" ? trade.slipUploadedAt : trade.shipment?.shippedAt;
  const level = staleLevel(startedAt, step);

  if (level === "fresh") return null;

  const rule = STALE_THRESHOLDS[step];
  // Only the waiting side gets the escalation; the party everyone is waiting on
  // has nothing to report.
  const isWaitingSide = trade.myRole === rule.reporter;
  const reportable = level === "reportable" && isWaitingSide;

  const waitingFor =
    step === "paymentConfirmation"
      ? "ผู้ขายยังไม่ยืนยันรับเงิน"
      : "ผู้ซื้อยังไม่ยืนยันรับพัสดุ";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-4",
        reportable ? "bg-error-bg" : "bg-warning-bg"
      )}
    >
      <div className="flex gap-3">
        {reportable ? (
          <AlertTriangle className="size-5 shrink-0 text-error" />
        ) : (
          <Clock className="size-5 shrink-0 text-warning-dark" />
        )}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">
            {waitingFor}
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {reportable
              ? `ค้างเกิน ${Math.round(rule.reportableAfterHours / 24) || 1} วันแล้ว คุณส่งเรื่องให้แอดมินตรวจสอบได้`
              : "ระบบส่งการแจ้งเตือนซ้ำให้อีกฝ่ายแล้ว และจะไม่เปลี่ยนสถานะให้เองไม่ว่ารอนานแค่ไหน"}
          </p>
        </div>
      </div>

      {reportable && (
        <Link
          href={`/disputes?trade=${trade.id}`}
          className={cn(buttonVariants(), "h-11 w-full bg-error hover:bg-error/90")}
        >
          รายงานให้แอดมินตรวจสอบ
        </Link>
      )}
    </div>
  );
}
