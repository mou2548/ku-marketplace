import Link from "next/link";
import { notFound } from "next/navigation";

import { QrWaitingCard } from "@/components/qr-waiting-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { getTrade, tradeStage } from "@/lib/trades";

/**
 * §4.6.2 — the handover QR lives on the SELLER's screen and appears the moment
 * they confirm the money arrived. §4.6 explains the direction: the fact being
 * proven is "goods reached the buyer", so the buyer must be the one scanning.
 */
export default async function TradeQrPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  const stage = tradeStage(trade);
  const canShowQr = trade.myRole === "seller" && stage === "awaiting-handover-qr";

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        {canShowQr ? (
          <QrWaitingCard tradeId={trade.id} />
        ) : (
          <Card className="w-full max-w-[440px] flex-col items-center gap-3 rounded-3xl p-8 text-center shadow-elevated ring-0">
            <h1 className="text-xl font-semibold text-foreground">
              ยังไม่มี QR Code สำหรับธุรกรรมนี้
            </h1>
            <p className="text-sm text-muted-foreground">
              {trade.myRole === "buyer"
                ? "QR Code จะแสดงบนหน้าจอของผู้ขาย ให้ใช้กล้องมือถือของคุณสแกนจากเครื่องผู้ขายเมื่อเจอกัน"
                : stage === "awaiting-slip"
                  ? "ผู้ซื้อยังไม่ได้อัปโหลดสลิปโอนเงิน"
                  : stage === "awaiting-payment-confirmation"
                    ? "ต้องกดยืนยันรับเงินก่อน ระบบจึงจะแสดง QR Code ให้อัตโนมัติ"
                    : "ขั้นตอนส่งมอบของธุรกรรมนี้ผ่านไปแล้ว"}
            </p>
            <Link
              href="/history"
              className="text-sm font-medium text-primary-dark underline underline-offset-2"
            >
              กลับไปหน้าประวัติธุรกรรม
            </Link>
          </Card>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
