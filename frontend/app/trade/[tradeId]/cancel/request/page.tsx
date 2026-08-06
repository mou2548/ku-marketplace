import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CancelRequestForm } from "@/components/cancel-request-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TradeSummaryCard } from "@/components/trade-summary-card";
import { Card } from "@/components/ui/card";
import {
  canCancelUnilaterally,
  getTrade,
  requiresMutualCancel,
} from "@/lib/trades";

/**
 * §4.7 — mutual cancellation, for trades that already reached Processing.
 *
 * A Pending trade never gets here: §2.4.1 lets either side walk away alone
 * before any money moves, so asking for consent would be friction with no
 * purpose. That case redirects to the plain cancel screen.
 */
export default async function CancelRequestPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();
  if (canCancelUnilaterally(trade)) redirect(`/trade/${trade.id}/cancel`);

  const alreadyRequested = trade.cancelRequest !== undefined;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <TradeSummaryCard trade={trade} />

        {requiresMutualCancel(trade) && !alreadyRequested ? (
          <CancelRequestForm tradeId={trade.id} />
        ) : (
          <Card className="flex-col gap-3 rounded-3xl p-6 text-center shadow-card ring-0">
            <h2 className="text-lg font-semibold text-foreground">
              {alreadyRequested ? "มีคำขอยกเลิกค้างอยู่แล้ว" : "ยกเลิกไม่ได้"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {alreadyRequested
                ? "คำขอก่อนหน้ายังไม่ได้ข้อสรุป ส่งคำขอซ้ำไม่ได้"
                : "ธุรกรรมนี้ปิดไปแล้ว จึงไม่มีอะไรให้ยกเลิก"}
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
