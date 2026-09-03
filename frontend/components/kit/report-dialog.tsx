"use client";

import { useState } from "react";
import { CircleCheck, Flag } from "lucide-react";

import { createReport } from "@/lib/actions/reports";
import type { ApiError } from "@/lib/api/client";

import { Button } from "./button";
import { Radio, RadioGroupField } from "./choice";
import { TextAreaField } from "./field";
import { Overlay, OverlayTrigger } from "./overlay";

/**
 * §7.5.1/§7.5.2 — the two report types that, unlike a transaction, have no
 * full-page flow of their own (`/history/[txId]/report`'s `ReportForm` stays
 * separate: it also shows deal context and gates on a flow deadline, neither
 * of which applies here). One small dialog, opened wherever a post or a
 * person actually shows up — the post's own action bar, a chat counterparty.
 */

export interface ReportReasonOption {
  id: string;
  label: string;
  description?: string;
}

export function ReportDialog({
  reportType,
  targetId,
  reasons,
  trigger,
}: {
  reportType: "Post" | "User";
  targetId: number;
  reasons: ReportReasonOption[];
  trigger: React.ReactNode;
}) {
  const [reason, setReason] = useState(reasons[0]?.id ?? "");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const label = reasons.find((r) => r.id === reason)?.label ?? reason;
      await createReport({
        report_type: reportType,
        target_id: targetId,
        reason_category: label,
        details: details || undefined,
      });
      setSubmitted(true);
    } catch (e) {
      setError((e as ApiError).message ?? "Could not submit the report.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setReason(reasons[0]?.id ?? "");
    setDetails("");
    setSubmitted(false);
    setError(undefined);
  }

  return (
    <OverlayTrigger onOpenChange={(open) => !open && reset()}>
      {trigger}
      <Overlay
        title={`Report this ${reportType === "Post" ? "post" : "user"}`}
        description={
          submitted
            ? undefined
            : "Choose the reason that best matches what happened. An admin reviews every report."
        }
        footer={
          submitted ? (
            <Button slot="close">Close</Button>
          ) : (
            <>
              <Button variant="ghost" slot="close">
                Cancel
              </Button>
              <Button
                variant="danger"
                isDisabled={!reason}
                isLoading={busy}
                onPress={submit}
              >
                <Flag className="size-4" />
                Submit report
              </Button>
            </>
          )
        }
      >
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-11 place-items-center rounded-pill bg-tone-success-bg text-tone-success-fg">
              <CircleCheck aria-hidden className="size-5" />
            </span>
            <p className="text-body text-ink-secondary">
              Report submitted. An admin will review it and let you know.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <RadioGroupField label="Reason" value={reason} onChange={setReason} variant="card">
              {reasons.map((r) => (
                <Radio key={r.id} value={r.id} description={r.description}>
                  {r.label}
                </Radio>
              ))}
            </RadioGroupField>

            <TextAreaField
              label="Details"
              value={details}
              onChange={setDetails}
              rows={4}
              placeholder="Anything that helps an admin understand what happened"
              hint="Optional, but the more detail the faster an admin can decide."
              errorMessage={error}
            />
          </div>
        )}
      </Overlay>
    </OverlayTrigger>
  );
}
