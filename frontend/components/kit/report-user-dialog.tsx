"use client";

import { Flag } from "lucide-react";

import { Button } from "./button";
import { ReportDialog, type ReportReasonOption } from "./report-dialog";

/**
 * §7.5.2 — the system-provided reasons for reporting a person, the same
 * wherever the report starts (their profile, a chat). Fraud, a fake slip or
 * an item that is not as described belong to a deal and are reported from
 * the deal itself (§7.5.3, /history/:txId/report); a listing is reported from
 * the listing (§7.5.1).
 */
export const USER_REPORT_REASONS: ReportReasonOption[] = [
  {
    id: "rude-or-threatening",
    label: "Rude or threatening behavior",
    description: "Insults, threats or hostile messages",
  },
  {
    id: "spam-or-disturbance",
    label: "Spam or disturbance",
    description: "Repeated unwanted messages",
  },
  {
    id: "impersonation",
    label: "Impersonating someone else",
    description: "Not who they claim to be",
  },
];

/**
 * Report a user. The same dialog and reasons everywhere; only the trigger
 * adapts to the space: a labelled button, or an icon where room is short.
 */
export function ReportUserDialog({
  userId,
  name,
  compact = false,
}: {
  userId: number;
  name: string;
  /** An icon-only trigger, for tight spots like a chat header. */
  compact?: boolean;
}) {
  return (
    <ReportDialog
      reportType="User"
      targetId={userId}
      reasons={USER_REPORT_REASONS}
      trigger={
        compact ? (
          <Button
            variant="ghost"
            size="icon-sm"
            pill
            aria-label={`Report ${name}`}
          >
            <Flag className="size-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" aria-label={`Report ${name}`}>
            <Flag aria-hidden className="size-4" />
            Report user
          </Button>
        )
      }
    />
  );
}
