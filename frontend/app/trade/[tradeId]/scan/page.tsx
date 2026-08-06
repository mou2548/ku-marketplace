import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert, ShieldCheck } from "lucide-react";

import { ScanConfirmPanel } from "@/components/scan-confirm-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TradeSummaryCard } from "@/components/trade-summary-card";
import { Card } from "@/components/ui/card";
import { getTrade, tradeStage } from "@/lib/trades";

/**
 * §4.6.4 — where the handover QR lands.
 *
 * Two checks stand between a scan and a completed trade:
 *   1. the signed-in account must be the buyer of THIS trade (below)
 *   2. a second deliberate confirm (§4.6.5, in ScanConfirmPanel)
 *
 * Both live server-side or behind an explicit press on purpose: the QR is
 * openable by any camera app (§4.6.3), so the link itself proves nothing.
 */
export default async function TradeScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tradeId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { tradeId } = await params;
  const { token } = await searchParams;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  // §4.6.4 — only the buyer may confirm receipt, because the fact being proven
  // is "the goods reached the buyer". The seller scanning their own code proves
  // nothing. TODO: compare against the real session user, not the mock role.
  const isEntitled = trade.myRole === "buyer";
  // §4.6.1 — the token is single-use and carries no personal data. Absent or
  // spent means the QR must be refreshed on the seller's screen (§4.6.6).
  // TODO: verify + burn the token server-side once the API exists.
  const hasToken = Boolean(token);
  const stage = tradeStage(trade);
  const isHandoverStage = stage === "awaiting-handover-qr";

  const blockedReason = !isEntitled
    ? "บัญชีที่คุณเข้าสู่ระบบอยู่ไม่ใช่ผู้ซื้อของธุรกรรมนี้ จึงไม่มีสิทธิ์ยืนยันการรับสินค้า"
    : !hasToken
      ? "ลิงก์นี้ไม่มีโทเคนยืนยัน กรุณาให้ผู้ขายรีเฟรช QR Code แล้วสแกนใหม่"
      : !isHandoverStage
        ? stage === "awaiting-payment-confirmation"
          ? "ผู้ขายยังไม่ได้ยืนยันรับเงิน จึงยังยืนยันรับสินค้าไม่ได้"
          : stage === "cancel-pending"
            ? "มีคำขอยกเลิกค้างอยู่ ปุ่มยืนยันถูกล็อกไว้จนกว่าจะได้ข้อสรุป"
            : "ธุรกรรมนี้ปิดไปแล้ว"
        : null;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <TradeSummaryCard trade={trade} />

        <Card className="flex-col items-center gap-5 rounded-3xl p-6 text-center shadow-card ring-0">
          {blockedReason ? (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-error-bg">
                <ShieldAlert className="size-7 text-error" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">
                  ยืนยันรายการนี้ไม่ได้
                </h2>
                <p className="text-sm text-muted-foreground">{blockedReason}</p>
              </div>
              {/* §4.6.4 — a rejected scan changes no state at all. */}
              <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
                ไม่มีสถานะใดถูกเปลี่ยนแปลงจากการสแกนครั้งนี้
              </p>
              <Link
                href="/history"
                className="text-sm font-medium text-primary-dark underline underline-offset-2"
              >
                กลับไปหน้าประวัติธุรกรรม
              </Link>
            </>
          ) : (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-primary-light">
                <ShieldCheck className="size-7 text-primary-dark" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">
                  ตรวจสอบสิทธิ์ผ่านแล้ว
                </h2>
                <p className="text-sm text-muted-foreground">
                  ตรวจสภาพสินค้าให้เรียบร้อยก่อน แล้วจึงกดยืนยันรับสินค้า
                </p>
              </div>

              <ScanConfirmPanel tradeId={trade.id} />

              {/* §4.2.6 — the way out when the goods are wrong, right here at
                  the moment the buyer is looking at them. */}
              <Link
                href={`/disputes?trade=${trade.id}`}
                className="text-xs text-error underline underline-offset-2"
              >
                สินค้าไม่ตรงตามคำอธิบาย? รายงานปัญหา
              </Link>
            </>
          )}
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
