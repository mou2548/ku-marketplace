import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, PackageSearch } from "lucide-react";

import { ShippingForm } from "@/components/shipping-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StaleTradeBanner } from "@/components/stale-trade-banner";
import { TradeSummaryCard } from "@/components/trade-summary-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCourier } from "@/lib/couriers";
import { getTrade, tradeStage } from "@/lib/trades";
import { cn } from "@/lib/utils";

/**
 * §4.3.1–§4.3.2 — the seller's shipping step, and afterwards the tracking
 * details both sides can see.
 *
 * §4.3.3 is the reason "confirm received" is NOT a button on this page: it
 * must sit behind its own screen, far away from the harmless "check status"
 * action, because pressing it closes the trade permanently.
 */
export default async function TradeShippingPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  const stage = tradeStage(trade);
  const canShip = trade.myRole === "seller" && stage === "awaiting-shipment";
  const courier = trade.shipment ? getCourier(trade.shipment.courier) : undefined;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <TradeSummaryCard trade={trade} />
        <StaleTradeBanner trade={trade} />

        {canShip ? (
          <ShippingForm tradeId={trade.id} />
        ) : trade.shipment ? (
          <Card className="flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-foreground">
                ข้อมูลการจัดส่ง
              </h2>
              <p className="text-sm text-muted-foreground">
                {trade.shipment.courier}
              </p>
              <p className="font-mono text-lg font-semibold text-primary-dark">
                {trade.shipment.trackingNumber}
              </p>
            </div>

            {/* §4.3.2 — the platform links out and lets the user check for
                themselves rather than integrating a carrier API. */}
            {courier && (
              <a
                href={courier.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-12 w-full gap-2 bg-white"
                )}
              >
                <PackageSearch className="size-4" />
                เช็คสถานะพัสดุ
                <ExternalLink className="size-3.5 opacity-60" />
              </a>
            )}

            {/* §4.3.3 — deliberately separated from the check-status button
                above: a whole sub-page away, and only for the buyer. */}
            {trade.myRole === "buyer" && stage === "awaiting-parcel-confirmation" && (
              <div className="flex flex-col gap-2 border-t border-border/20 pt-5">
                <p className="text-xs text-muted-foreground">
                  ได้รับพัสดุและตรวจสอบสินค้าเรียบร้อยแล้วใช่ไหม?
                  การยืนยันจะปิดธุรกรรมถาวร
                </p>
                <Link
                  href={`/trade/${trade.id}/shipping/confirm`}
                  className={cn(
                    buttonVariants(),
                    "h-12 w-full bg-primary-dark text-sm"
                  )}
                >
                  ไปหน้ายืนยันรับพัสดุ
                </Link>
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex-col gap-3 rounded-3xl p-6 text-center shadow-card ring-0">
            <h2 className="text-lg font-semibold text-foreground">
              ยังไม่มีข้อมูลการจัดส่ง
            </h2>
            <p className="text-sm text-muted-foreground">
              {trade.myRole === "buyer"
                ? "ผู้ขายยังไม่ได้แจ้งเลขพัสดุ"
                : stage === "awaiting-payment-confirmation"
                  ? "ต้องยืนยันรับเงินก่อนจึงจะแจ้งการจัดส่งได้"
                  : stage === "cancel-pending"
                    ? "มีคำขอยกเลิกค้างอยู่ ต้องได้ข้อสรุปก่อนจึงจะดำเนินการต่อได้"
                    : "ธุรกรรมนี้ไม่ได้อยู่ในขั้นตอนจัดส่ง"}
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
