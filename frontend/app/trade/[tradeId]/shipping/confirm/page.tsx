import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageCheck, ShieldAlert } from "lucide-react";

import { ParcelConfirmPanel } from "@/components/parcel-confirm-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TradeSummaryCard } from "@/components/trade-summary-card";
import { Card } from "@/components/ui/card";
import { getTrade, tradeStage } from "@/lib/trades";

/**
 * §4.3.3 — a sub-page whose only job is the confirm-received decision.
 *
 * It exists as a separate route on purpose: the proposal requires the
 * irreversible confirm to be kept well away from the harmless "check parcel
 * status" action, reached by an extra navigation, and to warn again before
 * recording anything.
 */
export default async function ParcelConfirmPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  const stage = tradeStage(trade);
  // §4.3.4 — receipt is the buyer's confirmation, and only once a parcel is
  // actually on its way.
  const canConfirm =
    trade.myRole === "buyer" && stage === "awaiting-parcel-confirmation";

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <Link
          href={`/trade/${trade.id}/shipping`}
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          กลับไปหน้าข้อมูลพัสดุ
        </Link>

        <TradeSummaryCard trade={trade} />

        <Card className="flex-col items-center gap-5 rounded-3xl p-6 text-center shadow-card ring-0">
          {canConfirm ? (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-primary-light">
                <PackageCheck className="size-7 text-primary-dark" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-foreground">
                  ยืนยันการรับพัสดุ
                </h1>
                <p className="text-sm text-muted-foreground">
                  {trade.shipment?.courier} • {trade.shipment?.trackingNumber}
                </p>
              </div>

              <div className="flex w-full gap-3 rounded-2xl bg-warning-bg p-4 text-left">
                <ShieldAlert className="size-5 shrink-0 text-warning-dark" />
                <p className="text-xs leading-relaxed text-foreground">
                  ตรวจสินค้าให้ครบก่อนกดยืนยัน
                  เมื่อยืนยันแล้วธุรกรรมจะเสร็จสมบูรณ์ทันทีและยกเลิกไม่ได้อีก
                  ระบบจะไม่ยืนยันแทนคุณเองแม้จะปล่อยไว้นานแค่ไหน
                </p>
              </div>

              <ParcelConfirmPanel tradeId={trade.id} />

              {/* §4.2.6 / §7 — the alternative to confirming, when the parcel
                  is wrong. Placed next to the confirm, not hidden elsewhere. */}
              <Link
                href={`/disputes?trade=${trade.id}`}
                className="text-xs text-error underline underline-offset-2"
              >
                สินค้าไม่ตรงตามคำอธิบาย หรือพัสดุมีปัญหา? รายงานแทน
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground">
                ยืนยันรับพัสดุไม่ได้
              </h1>
              <p className="text-sm text-muted-foreground">
                {trade.myRole === "seller"
                  ? "ผู้ซื้อเป็นฝ่ายยืนยันการรับพัสดุ"
                  : stage === "awaiting-shipment"
                    ? "ผู้ขายยังไม่ได้แจ้งเลขพัสดุ"
                    : stage === "cancel-pending"
                      ? "มีคำขอยกเลิกค้างอยู่ ปุ่มยืนยันถูกล็อกไว้จนกว่าจะได้ข้อสรุป"
                      : "ธุรกรรมนี้ปิดไปแล้ว"}
              </p>
              <Link
                href="/history"
                className="text-sm font-medium text-primary-dark underline underline-offset-2"
              >
                กลับไปหน้าประวัติธุรกรรม
              </Link>
            </>
          )}
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
