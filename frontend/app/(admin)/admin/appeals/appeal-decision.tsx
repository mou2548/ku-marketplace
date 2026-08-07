"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextAreaField } from "@/components/kit/field";
import { useToast } from "@/components/kit/toast";

export function AppealDecision({ appealId }: { appealId: number }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const canDecide = note.trim().length >= 20;

  async function decide(upheld: boolean) {
    setBusy(true);
    // POST /admin/appeals/{id}/decide
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(
      upheld
        ? `Appeal #${appealId} upheld. The penalty is lifted.`
        : `Appeal #${appealId} rejected. The original decision stands.`,
    );
    setNote("");
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      <TextAreaField
        label="Reasoning"
        value={note}
        onChange={setNote}
        rows={3}
        placeholder="What changed your view, or why the original decision holds"
        hint="Sent to the appellant. Required either way."
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          size="sm"
          isDisabled={!canDecide || busy}
          onPress={() => decide(false)}
        >
          <X className="size-4" />
          Reject appeal
        </Button>
        <Button
          size="sm"
          isDisabled={!canDecide}
          isLoading={busy}
          onPress={() => decide(true)}
        >
          <Check className="size-4" />
          Uphold appeal
        </Button>
      </div>
    </div>
  );
}
