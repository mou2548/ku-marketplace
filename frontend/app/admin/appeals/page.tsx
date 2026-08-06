import Link from "next/link";
import { UserX } from "lucide-react";

import { AppealDecisionActions } from "@/components/appeal-decision-actions";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ADMIN_ACTION_LABELS,
  APPEALS,
  APPEAL_STATUS_LABELS,
  canDecideAppeal,
  getReport,
  reasonLabel,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

/**
 * §7.4 — appeals, judged by an admin other than the one who ruled first.
 *
 * TODO: the signed-in admin is hard-coded until real admin identities exist.
 * Set to admin-2 so the separation rule is actually exercised: appeal-1 came
 * from a decision by admin-1, and admin-1 must not be able to rule on it.
 */
const CURRENT_ADMIN_ID = "admin-2";

export default function AdminAppealsPage() {
  return (
    <>
      <PageHeader
        title="คำอุทธรณ์"
        subtitle="ยื่นได้ภายใน 7 วันนับจากวันที่ได้รับแจ้งผล และต้องพิจารณาโดยแอดมินคนละคนกับผู้ตัดสินเดิม"
      />

      {APPEALS.length === 0 ? (
        <Card className="flex-col items-center gap-3 rounded-3xl p-8 py-16 text-center ring-0">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <UserX className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">ยังไม่มีคำอุทธรณ์</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {APPEALS.map((appeal) => {
            const report = getReport(appeal.reportId);
            const mayDecide = canDecideAppeal(appeal, CURRENT_ADMIN_ID);

            return (
              <Card
                key={appeal.id}
                className="flex-col gap-4 rounded-3xl p-6 shadow-card ring-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      {appeal.filedByName} อุทธรณ์คำตัดสิน
                    </span>
                    {report?.verdict && (
                      <span className="text-xs text-muted-foreground">
                        {reasonLabel(report.reason)} →{" "}
                        {ADMIN_ACTION_LABELS[report.verdict.action].th} • ตัดสินโดย{" "}
                        {appeal.originalAdminId}
                      </span>
                    )}
                  </div>
                  <Badge
                    className={cn(
                      "h-auto shrink-0 px-3 py-1 text-xs",
                      appeal.status === "pending"
                        ? "bg-warning-bg text-warning-dark"
                        : "bg-surface-muted text-muted-foreground"
                    )}
                  >
                    {APPEAL_STATUS_LABELS[appeal.status].th}
                  </Badge>
                </div>

                <p className="rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed text-foreground">
                  {appeal.reason}
                </p>

                {report && (
                  <Link
                    href={`/admin/reports/${report.id}`}
                    className="w-fit text-xs font-medium text-primary-dark underline underline-offset-2"
                  >
                    ดูรายงานและหลักฐานต้นเรื่อง
                  </Link>
                )}

                {appeal.status !== "pending" ? (
                  <p className="text-sm text-muted-foreground">
                    พิจารณาแล้วโดย {appeal.decidedByAdminId}
                  </p>
                ) : mayDecide ? (
                  <AppealDecisionActions appealId={appeal.id} />
                ) : (
                  /* §7.4 — the bar that makes the second review meaningful. */
                  <p className="rounded-2xl bg-error-bg px-4 py-3 text-xs text-error">
                    คุณเป็นผู้ตัดสินเรื่องนี้ในครั้งแรก
                    จึงพิจารณาคำอุทธรณ์นี้ไม่ได้ ต้องให้แอดมินคนอื่นพิจารณา
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
