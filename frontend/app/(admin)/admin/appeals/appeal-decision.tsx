"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import {
  AdminButton,
  AdminTextArea,
} from "@/components/admin/admin-controls";
import { AdminBox } from "@/components/admin/admin-ui";
import { useToast } from "@/components/kit/toast";
import { adminDecideAppeal } from "@/lib/actions/appeals";
import { ADMIN_SANCTION } from "@/lib/admin-labels";
import type { ApiError } from "@/lib/api/client";
import type { Sanction } from "@/lib/api/types";

const MIN_NOTE = 20;

/**
 * The flow's appeal result: upheld lifts the sanction, rejected keeps it.
 * Each button says what it does to this appeal's sanction, and the note goes
 * to the appellant either way.
 */
export function AppealDecision({
  appealId,
  sanction,
}: {
  appealId: number;
  sanction: Sanction | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"uphold" | "reject" | null>(null);

  const tooShort = note.trim().length < MIN_NOTE;
  const penalty = sanction ? ADMIN_SANCTION[sanction].toLowerCase() : "sanction";

  async function decide(upheld: boolean) {
    setBusy(upheld ? "uphold" : "reject");
    try {
      await adminDecideAppeal(appealId, {
        status: upheld ? "Approved" : "Rejected",
        resolution_note: note,
      });
      toast.success(
        upheld
          ? `Appeal #${appealId} upheld. The ${penalty} is lifted.`
          : `Appeal #${appealId} rejected. The ${penalty} stays.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        (error as ApiError).message ?? "Could not record the decision.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminBox
      aria-labelledby="appeal-decision-title"
      className="flex flex-col gap-4 p-4"
    >
      <div>
        <h2 id="appeal-decision-title" className="text-body font-medium">
          Decision
        </h2>
        <p className="text-body-sm text-ink-muted">
          Uphold lifts the {penalty} and restores the account. Reject keeps the
          {" "}
          {penalty} in place.
        </p>
      </div>

      <AdminTextArea
        label="Reasoning"
        value={note}
        onChange={setNote}
        rows={4}
        placeholder="What changed your view, or why the original decision holds"
        hint={
          tooShort
            ? `At least ${MIN_NOTE} characters (${note.trim().length} so far). Sent to the appellant either way.`
            : "Sent to the appellant either way."
        }
      />

      <div className="sticky action-bar-bottom z-[20] -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-line bg-surface px-4 py-3 sm:static sm:flex-row sm:justify-end">
        <AdminButton
          isDisabled={tooShort || busy === "uphold"}
          isLoading={busy === "reject"}
          onPress={() => decide(false)}
        >
          <X aria-hidden />
          Reject: keep the {penalty}
        </AdminButton>
        <AdminButton
          tone="primary"
          isDisabled={tooShort || busy === "reject"}
          isLoading={busy === "uphold"}
          onPress={() => decide(true)}
        >
          <Check aria-hidden />
          Uphold: lift the {penalty}
        </AdminButton>
      </div>
    </AdminBox>
  );
}
