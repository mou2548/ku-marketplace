"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel } from "lucide-react";

import {
  AdminButton,
  AdminRadio,
  AdminRadioGroup,
  AdminTextArea,
} from "@/components/admin/admin-controls";
import { AdminBox } from "@/components/admin/admin-ui";
import { useToast } from "@/components/kit/toast";
import { adminResolveReport } from "@/lib/actions/reports";
import {
  APPEAL_WINDOW_DAYS,
  TEMPORARY_SUSPENSION_DAYS,
} from "@/lib/admin-labels";
import type { ApiError } from "@/lib/api/client";
import type { Sanction } from "@/lib/api/types";

const VERDICTS = [
  {
    id: "dismiss",
    label: "Dismiss",
    description:
      "No violation. The report closes and nothing changes for the reported account.",
  },
  {
    id: "warn",
    label: "Warn",
    description: `A warning is recorded and the reported user is told. They keep full access and can appeal within ${APPEAL_WINDOW_DAYS} days.`,
  },
  {
    id: "suspend",
    label: `Suspend for ${TEMPORARY_SUSPENSION_DAYS} days`,
    description: `The account cannot use the marketplace for ${TEMPORARY_SUSPENSION_DAYS} days from now, then returns automatically. They can appeal within ${APPEAL_WINDOW_DAYS} days.`,
  },
  {
    id: "ban",
    label: "Ban permanently",
    description:
      "The account loses access until an appeal is upheld. Its history is kept.",
  },
] as const;

type VerdictId = (typeof VERDICTS)[number]["id"];

const SANCTION_BY_VERDICT: Record<Exclude<VerdictId, "dismiss">, Sanction> = {
  warn: "warn",
  suspend: "suspend_temporary",
  ban: "suspend_permanent",
};

const MIN_NOTE = 30;

/**
 * The flow's "guilty or not" decision and its sanction, recorded in one step.
 * Nothing is preselected: the admin has to choose. The note is long-form on
 * purpose: on a confirmed violation it is sent to the reported user and is
 * what any appeal is judged against. The reporter never sees it.
 */
export function ReportDecision({ reportId }: { reportId: number }) {
  const router = useRouter();
  const toast = useToast();
  const [verdict, setVerdict] = useState<VerdictId | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const chosen = VERDICTS.find((v) => v.id === verdict);
  const tooShort = note.trim().length < MIN_NOTE;

  async function decide() {
    if (!verdict) return;
    setBusy(true);
    try {
      if (verdict === "dismiss") {
        await adminResolveReport(reportId, {
          status: "Report_Dismissed",
          resolution_note: note,
        });
        toast.success("Report dismissed.");
      } else {
        await adminResolveReport(reportId, {
          status: "Violation_Confirmed",
          sanction: SANCTION_BY_VERDICT[verdict],
          resolution_note: note,
        });
        toast.success(
          "Decision recorded. The reported user is told and can appeal.",
        );
      }
      router.push("/admin/reports");
    } catch (error) {
      toast.error(
        (error as ApiError).message ?? "Could not record the decision.",
      );
      setBusy(false);
    }
  }

  return (
    <AdminBox
      aria-labelledby="decision-title"
      className="flex flex-col gap-4 p-4"
    >
      <h2 id="decision-title" className="text-body font-medium">
        Decision
      </h2>

      <AdminRadioGroup
        label="Verdict"
        value={verdict}
        onChange={(value) => setVerdict(value as VerdictId)}
      >
        {VERDICTS.map((v) => (
          <AdminRadio
            key={v.id}
            value={v.id}
            label={v.label}
            description={v.description}
          />
        ))}
      </AdminRadioGroup>

      <AdminTextArea
        label="Reasoning"
        value={note}
        onChange={setNote}
        rows={5}
        placeholder="What the evidence shows and why it leads to this verdict"
        hint={
          tooShort
            ? `At least ${MIN_NOTE} characters (${note.trim().length} so far). An appeal is judged against it.`
            : "If a violation is confirmed, the reported user receives this. The reporter never sees it."
        }
      />

      <div className="sticky action-bar-bottom z-[20] -mx-4 -mb-4 flex justify-end border-t border-line bg-surface px-4 py-3 sm:static">
        <AdminButton
          tone="primary"
          isDisabled={!chosen || tooShort}
          isLoading={busy}
          onPress={decide}
        >
          <Gavel aria-hidden />
          {chosen ? `Record decision: ${chosen.label}` : "Choose a verdict"}
        </AdminButton>
      </div>
    </AdminBox>
  );
}
