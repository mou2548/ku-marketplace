"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { TextAreaField } from "@/components/kit/field";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import type { AdminReportRow } from "@/lib/api/fixtures";
import { REPORT_STATUS } from "@/lib/status";

const VERDICTS = [
  {
    id: "dismiss",
    label: "Dismiss the report",
    description:
      "No violation found. Any post taken down over this report is restored.",
  },
  {
    id: "warn",
    label: "Warn the account",
    description: "A warning is recorded. The account keeps full access.",
  },
  {
    id: "suspend",
    label: "Suspend temporarily",
    description: "Access is blocked for a set period, then restored automatically.",
  },
  {
    id: "ban",
    label: "Ban permanently",
    description:
      "Access ends and the email is locked so the same person cannot re-register. History is kept, not deleted.",
  },
];

const APPEAL_WINDOW_DAYS = 7;
const MIN_NOTE = 30;

/**
 * The note is mandatory and long-form on purpose. It is sent to both parties
 * and becomes the basis of any appeal (flow 2), so a verdict recorded without
 * reasoning leaves the next admin with nothing to review.
 */
export function VerdictForm({ report }: { report: AdminReportRow }) {
  const router = useRouter();
  const toast = useToast();
  const [verdict, setVerdict] = useState("warn");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = note.trim().length < MIN_NOTE;

  async function decide() {
    setBusy(true);
    // POST /admin/reports/{id}/decide
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show("Decision recorded and sent to both parties.");
    router.push("/admin/reports");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
            Report #{report.report_id}
          </h1>
          <p className="text-[0.875rem] text-ink-muted">
            {report.reason_category} · {report.target}
          </p>
        </div>
        <StatusBadge status={REPORT_STATUS[report.status]} />
      </header>

      <Surface shape="card" className="flex flex-col gap-3 p-4">
        <p className="text-overline text-ink-muted uppercase">
          Reported by
        </p>
        <TrustBadge
          name={report.reporter.name}
          isVerified={report.reporter.isVerified}
          faculty={report.reporter.faculty}
          year={report.reporter.year}
        />
        <p className="border-t border-line pt-3 text-[0.8125rem] leading-[1.6] text-ink-muted">
          The chat, slips, and timestamps for {report.target} are attached to
          this case automatically.
        </p>
      </Surface>

      <RadioGroupField label="Decision" value={verdict} onChange={setVerdict} variant="card">
        {VERDICTS.map((v) => (
          <Radio key={v.id} value={v.id} description={v.description}>
            {v.label}
          </Radio>
        ))}
      </RadioGroupField>

      <TextAreaField
        label="Reasoning"
        value={note}
        onChange={setNote}
        rows={6}
        placeholder="What the evidence shows and why it leads to this decision"
        hint={
          tooShort
            ? `At least ${MIN_NOTE} characters. Both parties receive this, and it is what an appeal is judged against.`
            : `Both parties receive this. The accused can appeal within ${APPEAL_WINDOW_DAYS} days.`
        }
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onPress={() => router.back()}>
          Back
        </Button>
        <Button isDisabled={tooShort} isLoading={busy} onPress={decide}>
          <Gavel className="size-4" />
          Record decision
        </Button>
      </div>
    </div>
  );
}
