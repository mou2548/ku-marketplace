import Image from "next/image";
import { AlertTriangle, Wallet } from "lucide-react";

import { MembershipReviewActions } from "@/components/membership-review-actions";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MEMBERSHIP_PRICE_THB,
  MEMBERSHIP_REQUESTS,
} from "@/lib/memberships";
import { cn } from "@/lib/utils";

/**
 * §8 revenue 1 — the membership approval queue.
 *
 * Worth noting what this page is NOT: it is not a payments dashboard. The
 * money here flows to the platform's own account for its own service, which is
 * the one place §8.1's "platform never touches user money" rule does not
 * apply, because no user is on the other end of it.
 */
export default function AdminMembershipsPage() {
  const pending = MEMBERSHIP_REQUESTS.filter(
    (request) => request.status === "pending"
  );

  return (
    <>
      <PageHeader
        title="อนุมัติสมาชิก"
        subtitle={`ค่าสมาชิก ${MEMBERSHIP_PRICE_THB} บาท/เดือน โอนผ่านพร้อมเพย์และตรวจสลิปด้วยมือ — รออนุมัติ ${pending.length} รายการ`}
      />

      <div className="flex flex-col gap-4">
        {MEMBERSHIP_REQUESTS.map((request) => {
          const amountMatches = request.amount === MEMBERSHIP_PRICE_THB;

          return (
            <Card
              key={request.id}
              className={cn(
                "flex-col gap-4 rounded-3xl p-6 shadow-card ring-0",
                request.status !== "pending" && "opacity-70"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {request.userName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {request.userEmail} •{" "}
                    {new Date(request.submittedAt).toLocaleString("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <Badge
                  className={cn(
                    "h-auto shrink-0 gap-1.5 px-3 py-1 text-xs",
                    request.status === "pending"
                      ? "bg-warning-bg text-warning-dark"
                      : "bg-primary-light text-primary-dark"
                  )}
                >
                  <Wallet className="size-3.5" />
                  ฿{request.amount.toLocaleString()}
                </Badge>
              </div>

              {!amountMatches && request.status === "pending" && (
                <div className="flex gap-3 rounded-2xl bg-error-bg p-4">
                  <AlertTriangle className="size-5 shrink-0 text-error" />
                  <p className="text-xs leading-relaxed text-foreground">
                    ยอดในสลิป ฿{request.amount.toLocaleString()}{" "}
                    ไม่ตรงกับค่าสมาชิก ฿{MEMBERSHIP_PRICE_THB.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border/30 bg-surface-muted">
                <Image
                  src={request.slipImage}
                  alt={`สลิปของ ${request.userName}`}
                  fill
                  sizes="(max-width: 1000px) 100vw, 900px"
                  className="object-contain"
                />
              </div>

              {request.status === "pending" ? (
                <MembershipReviewActions
                  requestId={request.id}
                  amountMatches={amountMatches}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {request.status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"} โดย{" "}
                  {request.reviewedByAdminId}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
