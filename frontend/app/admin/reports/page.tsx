import Link from "next/link";
import { Clock, Paperclip } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_ACTION_LABELS, reasonLabel, reportQueue } from "@/lib/reports";
import { cn } from "@/lib/utils";

/**
 * §7.2 — the moderation queue: every report, in arrival order, nothing
 * reordered or pre-judged. No trust score, no priority flag, no auto-triage.
 * The admin opens them one at a time and decides each on its own evidence.
 */
export default function AdminReportsPage() {
  const queue = reportQueue();
  const openCount = queue.filter((report) => report.status === "open").length;

  return (
    <>
      <PageHeader
        title="คิวรายงาน"
        subtitle={`เรียงตามเวลาที่รายงานเข้ามา — รอตรวจสอบ ${openCount} รายการ`}
      />

      <div className="flex flex-col gap-4">
        {queue.map((report) => (
          <Card
            key={report.id}
            className={cn(
              "flex-col gap-4 rounded-3xl p-5 shadow-card ring-0",
              report.status === "resolved" && "opacity-70"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {reasonLabel(report.reason)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {report.reporterName} รายงาน {report.accusedName}
                  {report.tradeId && ` • ธุรกรรม #${report.tradeId}`}
                </span>
              </div>

              <Badge
                className={cn(
                  "h-auto shrink-0 gap-1.5 px-3 py-1 text-xs whitespace-nowrap",
                  report.status === "open"
                    ? "bg-warning-bg text-warning-dark"
                    : "bg-surface-muted text-muted-foreground"
                )}
              >
                <Clock className="size-3.5" />
                {report.status === "open"
                  ? "รอตรวจสอบ"
                  : ADMIN_ACTION_LABELS[report.verdict!.action].th}
              </Badge>
            </div>

            <p className="line-clamp-2 text-sm text-muted-foreground">
              {report.detail}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/20 pt-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="size-3.5" />
                หลักฐาน {report.evidenceCount} ไฟล์ •{" "}
                {new Date(report.createdAt).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>

              <Link
                href={`/admin/reports/${report.id}`}
                className={cn(
                  buttonVariants({
                    variant: report.status === "open" ? "default" : "outline",
                  }),
                  "h-10 px-5 text-sm",
                  report.status === "open" && "bg-primary-dark"
                )}
              >
                {report.status === "open" ? "พิจารณา" : "ดูผลการตัดสิน"}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
