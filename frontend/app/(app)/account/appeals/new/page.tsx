"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { Notice } from "@/components/patterns/notice";
import { useToast } from "@/components/kit/toast";
import { TwoColumn } from "@/components/kit/two-column";
import { createAppeal } from "@/lib/actions/appeals";
import type { ApiError } from "@/lib/api/client";

const MIN_LENGTH = 40;

export default function NewAppealPage() {
  const router = useRouter();
  const toast = useToast();
  const [reportId, setReportId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = reason.trim().length < MIN_LENGTH;

  async function submit() {
    setBusy(true);
    try {
      await createAppeal({ report_id: Number(reportId), reason });
      toast.success("Appeal submitted. An admin will review it.");
      router.push("/account/appeals");
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not submit the appeal.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * What makes an appeal succeed, beside the box you write it in. This is the
   * one screen where the quality of what the student types decides the outcome,
   * and the guidance was previously a single paragraph above the field.
   */
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
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to my appeals
      </Link>

      <h1 className="text-h1">Submit an appeal</h1>

      <Notice tone="info" className="max-w-xl">
        <p className="text-body-sm text-ink-secondary">
          An admin reviews your appeal. Say what the decision got wrong and what evidence has not
          been considered yet — restating the original complaint does not help
          them.
        </p>
      </Notice>

      <TextInput
        label="Report number"
        value={reportId}
        onChange={(v) => setReportId(v.replace(/\D/g, ""))}
        inputMode="numeric"
        placeholder="903"
        hint="Shown at the top of the decision you received"
      />

      <TextAreaField
        label="Why the decision was wrong"
        value={reason}
        onChange={setReason}
        rows={7}
        placeholder="What happened, what the decision missed, and what evidence proves it"
        hint={
          tooShort
            ? `At least ${MIN_LENGTH} characters. A one-line appeal gives the reviewer nothing to work with.`
            : undefined
        }
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
    </TwoColumn>
  );
}
