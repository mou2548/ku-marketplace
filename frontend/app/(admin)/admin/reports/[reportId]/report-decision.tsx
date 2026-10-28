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
import { unwrapAction } from "@/lib/action-result";
import { adminResolveReport } from "@/lib/actions/reports";
import {
  APPEAL_WINDOW_DAYS,
  TEMPORARY_SUSPENSION_DAYS,
} from "@/lib/admin-labels";
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
    description:
      "A warning is recorded and the reported user is told. They keep full access. A warning cannot be appealed.",
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

/** The button names the consequence and the person it lands on. */
const ACTION_LABEL: Record<VerdictId, (who: string) => string> = {
  dismiss: () => "Dismiss the report",
  warn: (who) => `Warn ${who}`,
  suspend: (who) => `Suspend ${who} for ${TEMPORARY_SUSPENSION_DAYS} days`,
  ban: (who) => `Ban ${who} permanently`,
};

const MIN_NOTE = 30;

/**
 * The flow's "guilty or not" decision and its sanction, recorded in one step.
 * Nothing is preselected: the admin has to choose. The note is long-form on
 * purpose: on a confirmed violation it is sent to the reported user and is
 * what any appeal is judged against. The reporter never sees it.
 */
export function ReportDecision({
  reportId,
  targetName,
}: {
  reportId: number;
  /** Who a sanction lands on; named in the verdict so it is never in doubt. */
  targetName: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [verdict, setVerdict] = useState<VerdictId | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const chosen = VERDICTS.find((v) => v.id === verdict);
  const who = targetName ?? "the reported user";
  const tooShort = note.trim().length < MIN_NOTE;

  async function decide() {
    if (!verdict) return;
    setBusy(true);
    try {
      if (verdict === "dismiss") {
        await unwrapAction(adminResolveReport(reportId, {
          status: "Report_Dismissed",
          resolution_note: note,
        }));
        toast.success("Report dismissed.");
      } else {
        await unwrapAction(adminResolveReport(reportId, {
          status: "Violation_Confirmed",
          sanction: SANCTION_BY_VERDICT[verdict],
          resolution_note: note,
        }));
        toast.success(
          verdict === "warn"
            ? "Warning recorded. The reported user is told."
            : "Decision recorded. The reported user is told and can appeal.",
        );
      }
      router.push("/admin/reports");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not record the decision.",
      );
      setBusy(false);
    }
  }

  return (
    <AdminBox
      aria-labelledby="decision-title"
      className="flex flex-col gap-4 p-4"
    >
      <div>
        <h2 id="decision-title" className="text-body font-medium">
          Decision
        </h2>
        <p className="text-body-sm text-ink-muted">
          Any sanction applies to <strong className="text-ink">{who}</strong>,
          not the person who reported.
        </p>
      </div>

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

      <div className="sticky action-bar-bottom z-[20] -mx-4 -mb-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-line bg-surface px-4 py-3 sm:static">
        {/* Say why the button is off, next to it, instead of leaving the
            admin to find the counter under the text box. */}
        {!chosen || tooShort ? (
          <p role="status" className="text-meta text-ink-muted">
            {!chosen
              ? "Choose a verdict first."
              : `Write ${MIN_NOTE - note.trim().length} more characters of reasoning to record it.`}
          </p>
        ) : null}
        <AdminButton
          tone="primary"
          isDisabled={!chosen || tooShort}
          isLoading={busy}
          onPress={decide}
        >
          <Gavel aria-hidden />
          {verdict ? ACTION_LABEL[verdict](who) : "Choose a verdict"}
        </AdminButton>
      </div>
    </AdminBox>
  );
}
