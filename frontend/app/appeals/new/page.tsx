import Link from "next/link";
import { notFound } from "next/navigation";
import { Scale } from "lucide-react";

import { AppealForm } from "@/components/appeal-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import {
  ADMIN_ACTION_LABELS,
  APPEAL_WINDOW_DAYS,
  appealDeadline,
  canAppeal,
  getReport,
  reasonLabel,
} from "@/lib/reports";

/**
 * §7.4 — the punished party's side of the appeal.
 *
 * The window is a hard boundary: past 7 days from the verdict there is no form
 * to fill in, and the page says why rather than accepting a submission that
 * would be thrown away.
 */
export default async function NewAppealPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  const { report: reportId } = await searchParams;
  const report = reportId ? getReport(reportId) : undefined;

  if (!report) notFound();

  const eligible = canAppeal(report);
  const deadline = report.verdict ? appealDeadline(report.verdict.at) : undefined;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <Card className="flex-col gap-4 rounded-3xl p-6 shadow-card ring-0">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted">
              <Scale className="size-6 text-primary-dark" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg font-semibold text-foreground">
                ยื่นอุทธรณ์คำตัดสิน
              </h1>
              <p className="text-xs text-muted-foreground">
                {reasonLabel(report.reason)}
                {report.verdict &&
                  ` → ${ADMIN_ACTION_LABELS[report.verdict.action].th}`}
              </p>
            </div>
          </div>

          {report.verdict && (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed text-foreground">
              {report.verdict.note}
            </p>
          )}

          {deadline && (
            <p className="text-xs text-muted-foreground">
              ยื่นอุทธรณ์ได้ภายใน {APPEAL_WINDOW_DAYS} วันนับจากวันที่ได้รับแจ้งผล
              — ถึงวันที่{" "}
              {deadline.toLocaleDateString("th-TH", { dateStyle: "medium" })}
            </p>
          )}
        </Card>

        {eligible ? (
          <AppealForm reportId={report.id} />
        ) : (
          <Card className="flex-col gap-3 rounded-3xl p-6 text-center shadow-card ring-0">
            <h2 className="text-lg font-semibold text-foreground">
              ยื่นอุทธรณ์ไม่ได้
            </h2>
            <p className="text-sm text-muted-foreground">
              {!report.verdict
                ? "รายงานนี้ยังไม่มีคำตัดสิน จึงยังไม่มีอะไรให้อุทธรณ์"
                : report.verdict.action === "dismiss"
                  ? "คำตัดสินนี้ไม่ได้ลงโทษบัญชีของคุณ"
                  : "เลยกำหนด 7 วัน หรือมีคำอุทธรณ์ของเรื่องนี้อยู่แล้ว"}
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
