"use client";

import { Flag } from "lucide-react";

import { Button } from "./button";
import { ReportDialog, type ReportReasonOption } from "./report-dialog";

/**
 * The one set of reasons for reporting a person, wherever the report starts
 * (their profile, a chat). Two copies had drifted into different lists, so the
 * same complaint was worded one way from a chat and another from a profile,
 * and an admin saw both.
 */
export const USER_REPORT_REASONS: ReportReasonOption[] = [
  {
    id: "fraud",
    label: "Fraud or scam",
    description: "Took money or goods and did not deliver, fake slip",
  },
  {
    id: "rude-or-threatening",
    label: "Rude, harassing or threatening",
    description: "Insults, threats or hostile messages",
  },
  {
    id: "spam",
    label: "Spam or disturbance",
    description: "Repeated unwanted messages",
  },
  {
    id: "impersonation",
    label: "Impersonating someone else",
    description: "Not who they claim to be",
  },
  {
    id: "other",
    label: "Something else",
    description: "Explain in the details",
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
