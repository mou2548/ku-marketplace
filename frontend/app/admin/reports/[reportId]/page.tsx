import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Paperclip, ShieldOff } from "lucide-react";

import { AdminVerdictForm } from "@/components/admin-verdict-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ADMIN_ACTION_LABELS,
  appealDeadline,
  getReport,
  reasonLabel,
} from "@/lib/reports";
import { TRADE_STATUS_LABELS, getTrade } from "@/lib/trades";

/**
 * §7.1 — one report, with the evidence an admin is expected to weigh: the
 * attachments, the chat history of the related trade, and the timestamps of
 * each step (§4.5).
 */
export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = getReport(reportId);

  if (!report) notFound();

  const trade = report.tradeId ? getTrade(report.tradeId) : undefined;

  return (
    <>
      <Link
        href="/admin/reports"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปคิวรายงาน
      </Link>

      <Card className="flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-foreground">
              {reasonLabel(report.reason)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {report.reporterName} รายงาน {report.accusedName} •{" "}
              {new Date(report.createdAt).toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
          <Badge className="h-auto gap-1.5 bg-surface-muted px-3 py-1 text-xs text-muted-foreground">
            <Paperclip className="size-3.5" />
            หลักฐาน {report.evidenceCount} ไฟล์
          </Badge>
        </div>

        <p className="rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed text-foreground">
          {report.detail}
        </p>

        {/* §7.1 / §4.5 — the record an admin judges from: what state the trade
            reached, and when each confirmation was pressed. */}
        {trade && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border/40 p-4">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              บันทึกของธุรกรรม #{trade.id}
            </span>
            <dl className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">สถานะ</dt>
                <dd className="font-medium text-foreground">
                  {TRADE_STATUS_LABELS[trade.status].th}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">ผู้ซื้อกดยืนยันโอนเงิน</dt>
                <dd className="font-medium text-foreground">
                  {trade.slipUploadedAt
                    ? new Date(trade.slipUploadedAt).toLocaleString("th-TH")
                    : "ยังไม่กด"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">ผู้ขายยืนยันรับเงิน</dt>
                <dd className="font-medium text-foreground">
                  {trade.paymentConfirmedAt
                    ? new Date(trade.paymentConfirmedAt).toLocaleString("th-TH")
                    : "ยังไม่กด"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">ยืนยันรับมอบสินค้า</dt>
                <dd className="font-medium text-foreground">
                  {trade.handoverConfirmedAt
                    ? new Date(trade.handoverConfirmedAt).toLocaleString("th-TH")
                    : "ยังไม่กด"}
                </dd>
              </div>
            </dl>

            <Link
              href="/chat"
              className="flex items-center gap-2 text-xs font-medium text-primary-dark underline underline-offset-2"
            >
              <MessageSquare className="size-3.5" />
              เปิดประวัติการสนทนาของธุรกรรมนี้
            </Link>
          </div>
        )}

        {/* §2.5 — spelled out where the decision is made, so nobody reaches for
            a power the platform does not have. */}
        <div className="flex gap-3 rounded-2xl bg-warning-bg p-4">
          <ShieldOff className="size-5 shrink-0 text-warning-dark" />
          <p className="text-xs leading-relaxed text-foreground">
            แอดมินตัดสินได้เฉพาะระดับบัญชีเท่านั้น
            ไม่มีอำนาจสั่งคืนเงินหรือบังคับคืนสินค้าแทนคู่กรณี
            เนื่องจากแพลตฟอร์มไม่เคยถือเงินหรือสินค้าจริง
          </p>
        </div>
      </Card>

      <Card className="flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
        {report.status === "open" ? (
          <AdminVerdictForm reportId={report.id} />
        ) : (
          report.verdict && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                ตัดสินแล้ว
              </span>
              <span className="text-lg font-semibold text-foreground">
                {ADMIN_ACTION_LABELS[report.verdict.action].th}
              </span>
              <p className="text-sm text-muted-foreground">
                {report.verdict.note}
              </p>
              <p className="text-xs text-muted-foreground">
                โดย {report.verdict.byAdminId} เมื่อ{" "}
                {new Date(report.verdict.at).toLocaleString("th-TH")} •
                อุทธรณ์ได้ถึง{" "}
                {appealDeadline(report.verdict.at).toLocaleDateString("th-TH", {
                  dateStyle: "medium",
                })}
              </p>
            </div>
          )
        )}
      </Card>
    </>
  );
}
