import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, QrCode } from "lucide-react";

import { PaymentReviewActions } from "@/components/payment-review-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TradeSummaryCard } from "@/components/trade-summary-card";
import { Card } from "@/components/ui/card";
import { getTrade, tradeAmount, tradeStage } from "@/lib/trades";

/**
 * §4.1 / §4.2.4 — seller reviews the slip and confirms receipt.
 *
 * Note what this page deliberately does NOT do: no automatic slip parsing, no
 * verdict from the platform. §4.1 puts the check in the seller's own banking
 * app, and §2.5 keeps the platform out of judging money entirely.
 */
export default async function PaymentReviewPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  const stage = tradeStage(trade);
  const amount = tradeAmount(trade);
  // §4.2.4 — confirming receipt is the seller's call alone. The buyer must not
  // be able to mark their own payment as received.
  const awaitingConfirmation =
    trade.myRole === "seller" && stage === "awaiting-payment-confirmation";

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <TradeSummaryCard trade={trade} />

        {!awaitingConfirmation ? (
          <Card className="flex-col gap-3 rounded-3xl p-6 text-center shadow-card ring-0">
            <h2 className="text-lg font-semibold text-foreground">
              ยังไม่มีสลิปให้ตรวจสอบ
            </h2>
            <p className="text-sm text-muted-foreground">
              {trade.myRole === "buyer"
                ? "ผู้ขายเป็นฝ่ายตรวจสอบสลิปและยืนยันรับเงินในขั้นตอนนี้"
                : stage === "awaiting-slip"
                  ? "ผู้ซื้อยังไม่ได้อัปโหลดสลิปโอนเงิน"
                  : stage === "cancel-pending"
                    ? "มีคำขอยกเลิกค้างอยู่ ปุ่มยืนยันถูกล็อกไว้จนกว่าจะได้ข้อสรุป"
                    : "ขั้นตอนการยืนยันรับเงินของธุรกรรมนี้ผ่านไปแล้ว"}
            </p>
            <Link
              href="/history"
              className="text-sm font-medium text-primary-dark underline underline-offset-2"
            >
              กลับไปหน้าประวัติธุรกรรม
            </Link>
          </Card>
        ) : (
          <Card className="flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Step 2 — ตรวจสอบสลิป
              </span>
              <h2 className="text-xl font-semibold text-foreground">
                ผู้ซื้อแจ้งว่าโอนเงินแล้ว
              </h2>
              {amount > 0 && (
                <p className="text-sm text-muted-foreground">
                  ยอดที่ต้องได้รับ{" "}
                  <span className="font-semibold text-primary-dark">
                    ฿{amount.toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            {trade.slipImage && (
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border/30 bg-surface-muted">
                <Image
                  src={trade.slipImage}
                  alt={`สลิปโอนเงินของธุรกรรม ${trade.id}`}
                  fill
                  sizes="(max-width: 600px) 100vw, 552px"
                  className="object-contain"
                />
              </div>
            )}

            {/* §4.1 — the recommended fake-slip check, stated where it is
                actionable rather than in a help page nobody opens. */}
            <div className="flex gap-3 rounded-2xl bg-warning-bg p-4">
              <AlertTriangle className="size-5 shrink-0 text-warning-dark" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground">
                  ตรวจสลิปปลอมก่อนกดยืนยัน
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  สลิปของธนาคารในไทยมี QR Code กำกับเสมอ
                  ใช้แอปธนาคารของคุณสแกน QR บนสลิปเพื่อตรวจสอบรายการโอนได้ฟรี
                  แล้วเทียบกับยอดเงินในบัญชีจริงก่อนกดยืนยันทุกครั้ง
                </p>
              </div>
            </div>

            <PaymentReviewActions
              tradeId={trade.id}
              deliveryMethod={trade.deliveryMethod}
            />

            <div className="flex items-start gap-2 border-t border-border/20 pt-4 text-xs text-muted-foreground">
              <QrCode className="mt-0.5 size-4 shrink-0" />
              <span>
                เมื่อยืนยันแล้ว ระบบจะแสดง QR Code สำหรับให้ผู้ซื้อสแกนรับสินค้าทันที
                โดยไม่ต้องกดปุ่มเพิ่ม
              </span>
            </div>
          </Card>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
