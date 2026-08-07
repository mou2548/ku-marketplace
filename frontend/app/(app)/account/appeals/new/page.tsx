"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";

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
    // POST /appeals
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show("Appeal submitted. A different admin will review it.");
    router.push("/account/appeals");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Submit an appeal
      </h1>

      <Surface shape="card" elevation="flat" className="bg-tone-info-bg p-4">
        <p className="text-[0.875rem] leading-[1.7] text-ink-secondary">
          A different admin from the one who made the original decision reviews
          your appeal. Say what the decision got wrong and what evidence has not
          been considered yet — restating the original complaint does not help
          them.
        </p>
      </Surface>

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
    </div>
  );
}
