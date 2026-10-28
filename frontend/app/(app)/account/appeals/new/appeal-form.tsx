"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";
import { Radio, RadioGroup } from "react-aria-components";

import { Button, LinkButton } from "@/components/kit/button";
import { EvidencePicker } from "@/components/kit/evidence-picker";
import { TextAreaField } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { TwoColumn } from "@/components/kit/two-column";
import { unwrapAction } from "@/lib/action-result";
import { createAppeal } from "@/lib/actions/appeals";
import { uploadFile } from "@/lib/actions/uploads";
import type { EligibleAppeal } from "@/lib/api/appeals";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 40;

const SANCTION: Record<string, string> = {
  none: "No penalty",
  warn: "Warning",
  suspend_temporary: "Suspended for 3 days",
  suspend_permanent: "Banned",
};

/**
 * The flow's "ยื่นอุทธรณ์": the penalised user picks the decision they contest
 * (no report number to look up), says what it got wrong, and attaches the
 * evidence the first decision did not have.
 */
export function AppealForm({
  decisions,
  initialReportId,
}: {
  decisions: EligibleAppeal[];
  initialReportId: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [reportId, setReportId] = useState<string | null>(
    initialReportId && decisions.some((d) => d.report_id === initialReportId)
      ? String(initialReportId)
      : decisions.length === 1
        ? String(decisions[0].report_id)
        : null,
  );
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const tooShort = reason.trim().length < MIN_LENGTH;

  async function submit() {
    if (!reportId) return;
    setBusy(true);
    try {
      const evidence_urls: string[] = [];
      for (const photo of photos) evidence_urls.push(await unwrapAction(uploadFile(photo)));
      await unwrapAction(createAppeal({
        report_id: Number(reportId),
        reason,
        evidence_urls: evidence_urls.length ? evidence_urls : undefined,
      }));
      toast.success("Appeal submitted. An admin will review it.");
      router.push("/account/appeals");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the appeal.");
      setBusy(false);
    }
  }

  const guidance = (
    <Surface shape="card" className="flex flex-col gap-4 p-5">
      <p className="text-overline text-ink-muted uppercase">
        What an admin looks for
      </p>
      <ul className="flex flex-col gap-3 text-caption leading-[1.6] text-ink-secondary">
        <li>
          <span className="block font-medium text-ink">
            Evidence that was not seen
          </span>
          A message, a slip, or a photo the first decision did not have.
          Attach it below.
        </li>
        <li>
          <span className="block font-medium text-ink">
            What the decision got wrong
          </span>
          Point at the specific finding, not the outcome.
        </li>
        <li>
          <span className="block font-medium text-ink">Dates and order</span>
          What happened when. The chat is timestamped and an admin will check.
        </li>
      </ul>
      <p className="border-t border-line pt-3 text-meta leading-[1.6] text-ink-muted">
        Restating the original complaint does not help. One appeal per decision.
      </p>
    </Surface>
  );

  return (
    <TwoColumn rail={guidance}>
      <Link
        href="/account/appeals"
        className="touch-link flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to my appeals
      </Link>

      <h1 className="text-h1">Submit an appeal</h1>

      {decisions.length === 0 ? (
        <Surface shape="card" className="flex max-w-xl flex-col gap-3 p-5">
          <p className="text-body text-ink-secondary">
            There is no decision you can appeal right now. A decision can be
            appealed once, within 7 days of being made.
          </p>
          <LinkButton href="/account/appeals" variant="secondary" className="w-fit">
            Back to my appeals
          </LinkButton>
        </Surface>
      ) : (
        <>
          <RadioGroup
            aria-label="Decision to appeal"
            value={reportId}
            onChange={setReportId}
            className="flex max-w-xl flex-col gap-2"
          >
            <p className="text-body-sm font-medium text-ink-secondary">
              Which decision are you appealing?
            </p>
            {decisions.map((decision) => (
              <Radio
                key={decision.report_id}
                value={String(decision.report_id)}
                className={({ isSelected, isFocusVisible }) =>
                  cn(
                    "cursor-pointer rounded-control border bg-surface p-4 transition-colors",
                    isSelected
                      ? "border-brand ring-1 ring-brand"
                      : "border-line hover:border-line-default",
                    isFocusVisible && "ring-2 ring-brand",
                  )
                }
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink">
                    {decision.reason_category}
                  </span>
                  <span className="rounded-pill bg-tone-danger-bg px-2.5 py-0.5 text-meta font-medium text-tone-danger-fg">
                    {SANCTION[decision.sanction ?? "none"] ?? "Penalty"}
                  </span>
                </span>
                {decision.resolution_note ? (
                  <span className="mt-1 block text-body-sm text-ink-secondary">
                    {decision.resolution_note}
                  </span>
                ) : null}
                <span className="mt-2 block text-meta text-ink-muted">
                  Appeal by {formatDateTime(new Date(decision.deadline))}
                </span>
              </Radio>
            ))}
          </RadioGroup>

          <TextAreaField
            className="max-w-xl"
            label="Why the decision was wrong"
            value={reason}
            onChange={setReason}
            rows={7}
            placeholder="What happened, what the decision missed, and what evidence proves it"
            hint={
              tooShort
                ? `At least ${MIN_LENGTH} characters (${reason.trim().length} so far).`
                : undefined
            }
          />

          <div className="max-w-xl">
            <EvidencePicker
              files={photos}
              onChange={setPhotos}
              label="Evidence photos (optional)"
              hint="Screenshots of messages, a slip, photos of the item. Only the admin sees them."
            />
          </div>

          <div className="flex max-w-xl flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {!reportId || tooShort ? (
              <p role="status" className="text-meta text-ink-muted sm:mr-auto">
                {!reportId
                  ? "Choose the decision you are appealing."
                  : `Write ${MIN_LENGTH - reason.trim().length} more characters to submit.`}
              </p>
            ) : null}
            <Button variant="ghost" onPress={() => router.back()}>
              Cancel
            </Button>
            <Button
              isDisabled={!reportId || tooShort}
              isLoading={busy}
              onPress={submit}
            >
              <Scale className="size-4" />
              Submit appeal
            </Button>
          </div>
        </>
      )}
    </TwoColumn>
  );
}
