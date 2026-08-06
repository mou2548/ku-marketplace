import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { DeleteAccountActions } from "@/components/delete-account-actions";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { TRADES, TRADE_STATUS_LABELS, isTradeLive } from "@/lib/trades";

/**
 * §1.7 — self-deletion, blocked while any transaction is still Pending or
 * Processing. The point is not tidiness: it stops someone from walking away
 * from an obligation mid-deal and leaving the counterparty with no one to
 * report. Accounts banned through §7 are never deleted at all — their history
 * is retained and the email locked against re-registration.
 */
export default function DeleteAccountPage() {
  const liveTrades = TRADES.filter(isTradeLive);
  const blocked = liveTrades.length > 0;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader
          title="ลบบัญชี"
          subtitle="การลบบัญชีเป็นการกระทำถาวรและย้อนกลับไม่ได้"
        />

        {blocked ? (
          <Card className="flex-col gap-4 rounded-3xl p-6 shadow-card ring-0">
            <div className="flex gap-3 rounded-2xl bg-warning-bg p-4">
              <ShieldAlert className="size-5 shrink-0 text-warning-dark" />
              <p className="text-xs leading-relaxed text-foreground">
                ลบบัญชีไม่ได้ขณะที่ยังมีธุรกรรมค้างอยู่ในสถานะ Pending หรือ
                Processing เพื่อป้องกันการหลบเลี่ยงความรับผิดชอบระหว่างที่ดีลยังไม่จบ
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-foreground">
                ธุรกรรมที่ยังดำเนินอยู่ ({liveTrades.length})
              </span>
              <ul className="flex flex-col gap-1.5">
                {liveTrades.map((trade) => (
                  <li
                    key={trade.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-2.5 text-xs"
                  >
                    <span className="text-foreground">
                      #{trade.id} กับ {trade.counterpartyName}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {TRADE_STATUS_LABELS[trade.status].th}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/history"
              className="text-center text-sm font-medium text-primary-dark underline underline-offset-2"
            >
              ไปจัดการธุรกรรมที่ค้างอยู่
            </Link>
          </Card>
        ) : (
          <Card className="flex-col gap-4 rounded-3xl p-6 shadow-card ring-0">
            <p className="text-sm text-muted-foreground">
              ไม่มีธุรกรรมค้างอยู่ คุณลบบัญชีได้
              ประวัติธุรกรรมที่เสร็จสมบูรณ์แล้วจะยังถูกเก็บไว้เป็นหลักฐานของคู่กรณี
            </p>
            <DeleteAccountActions />
          </Card>
        )}

        <Link
          href="/account"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          กลับไปหน้าบัญชี
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
