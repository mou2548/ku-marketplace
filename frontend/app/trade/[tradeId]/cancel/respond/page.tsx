import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpCircle, Lock } from "lucide-react";

import { CancelRespondActions } from "@/components/cancel-respond-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TradeSummaryCard } from "@/components/trade-summary-card";
import { Card } from "@/components/ui/card";
import { getTrade } from "@/lib/trades";

/**
 * §4.7 — the receiving end of a cancel request.
 *
 * Only the party who did NOT ask may answer, which is what makes the mutual
 * consent rule real rather than a formality.
 */
export default async function CancelRespondPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  const request = trade.cancelRequest;
  const canRespond =
    request !== undefined &&
    request.response === undefined &&
    request.requestedBy !== trade.myRole;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <TradeSummaryCard trade={trade} />

        <Card className="flex-col items-center gap-5 rounded-3xl p-6 text-center shadow-card ring-0">
          {canRespond ? (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-warning-bg">
                <HelpCircle className="size-7 text-warning-dark" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-foreground">
                  อีกฝ่ายขอยกเลิกธุรกรรม
                </h1>
                <p className="text-sm text-muted-foreground">
                  {request.requestedBy === "buyer" ? "ผู้ซื้อ" : "ผู้ขาย"}
                  เป็นฝ่ายส่งคำขอ — คุณเลือกได้ว่าจะยินยอมหรือไม่
                </p>
              </div>

              <div className="flex w-full gap-3 rounded-2xl bg-surface-muted p-4 text-left">
                <Lock className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  ระหว่างที่คำขอยังไม่ได้ข้อสรุป
                  ปุ่มยืนยันรับเงินและยืนยันรับสินค้าถูกล็อกไว้ทั้งคู่
                  ธุรกรรมจึงเดินต่อไม่ได้จนกว่าจะตอบ
                </p>
              </div>

              <CancelRespondActions tradeId={trade.id} />
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground">
                ไม่มีคำขอให้ตอบ
              </h1>
              <p className="text-sm text-muted-foreground">
                {request === undefined
                  ? "ธุรกรรมนี้ไม่มีคำขอยกเลิกค้างอยู่"
                  : request.response !== undefined
                    ? "คำขอนี้ได้ข้อสรุปไปแล้ว"
                    : "คุณเป็นฝ่ายส่งคำขอเอง จึงตอบคำขอของตัวเองไม่ได้ ต้องรออีกฝ่ายตอบ"}
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
