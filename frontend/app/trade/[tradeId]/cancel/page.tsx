import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelTradeDialog } from "@/components/cancel-trade-dialog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { getTrade, isTradeLive, requiresMutualCancel } from "@/lib/trades";

export default async function TradeCancelPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {isTradeLive(trade) ? (
          <CancelTradeDialog
            tradeId={trade.id}
            mutual={requiresMutualCancel(trade)}
          />
        ) : (
          <Card className="w-full max-w-[440px] flex-col items-center gap-3 rounded-3xl p-8 text-center shadow-elevated ring-0">
            <h1 className="text-xl font-semibold text-foreground">
              ยกเลิกไม่ได้
            </h1>
            <p className="text-sm text-muted-foreground">
              ธุรกรรมนี้ปิดไปแล้ว จึงไม่มีอะไรให้ยกเลิก
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
