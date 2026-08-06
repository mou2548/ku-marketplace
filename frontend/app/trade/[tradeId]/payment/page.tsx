import { notFound } from "next/navigation";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SlipUploadForm } from "@/components/slip-upload-form";
import { StaleTradeBanner } from "@/components/stale-trade-banner";
import { TradeSummaryCard } from "@/components/trade-summary-card";
import { Card } from "@/components/ui/card";
import { getTrade, tradeStage } from "@/lib/trades";

/**
 * §4.1 — buyer's payment step. Server component: the guards below decide what
 * may be rendered at all, so they must not be reachable from the client.
 */
export default async function TradePaymentPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  const stage = tradeStage(trade);
  // Only the buyer pays, and only while the slip is still missing. Anything
  // else lands on the explainer below rather than a form that can't do anything.
  const canUpload = trade.myRole === "buyer" && stage === "awaiting-slip";

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <TradeSummaryCard trade={trade} />
        <StaleTradeBanner trade={trade} />

        {canUpload ? (
          <SlipUploadForm tradeId={trade.id} />
        ) : (
          <Card className="flex-col gap-3 rounded-3xl p-6 text-center shadow-card ring-0">
            <h2 className="text-lg font-semibold text-foreground">
              ขั้นตอนนี้ไม่พร้อมใช้งาน
            </h2>
            <p className="text-sm text-muted-foreground">
              {trade.myRole === "seller"
                ? "ผู้ซื้อเป็นฝ่ายอัปโหลดสลิปในขั้นตอนนี้"
                : stage === "cancel-pending"
                  ? "มีคำขอยกเลิกค้างอยู่ ต้องได้ข้อสรุปก่อนจึงจะดำเนินการต่อได้"
                  : "ธุรกรรมนี้ผ่านขั้นตอนการโอนเงินไปแล้ว"}
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
