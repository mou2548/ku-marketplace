"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ImagePlus, ShieldAlert } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { TextAreaField } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import type { Deadline } from "@/lib/status";

const REASONS = [
  {
    id: "no-payment",
    label: "Payment never arrived",
    description: "You transferred but the money never arrived, or the amount is wrong",
  },
  {
    id: "no-item",
    label: "Item never arrived",
    description: "The deadline has passed with no item, or they did not show up",
  },
  {
    id: "not-as-described",
    label: "Item not as described",
    description: "The condition or details differ significantly from the listing",
  },
  {
    id: "fake-slip",
    label: "Suspicious slip",
    description: "The slip looks edited, or belongs to a different transaction",
  },
  { id: "other", label: "Other", description: "Something the options above do not cover" },
];

export function ReportForm({
  transactionId,
  itemName,
  counterparty,
  allowed,
  deadline,
}: {
  transactionId: number;
  itemName: string;
  counterparty: string;
  allowed: boolean;
  deadline?: Deadline;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [reason, setReason] = useState("no-payment");
  const [details, setDetails] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // R2: not an error page. The user is worried; tell them exactly when they can
  // act and let them go back with that answer.
  if (!allowed) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <Surface shape="card" className="flex flex-col gap-3 p-5">
          <span className="grid size-11 place-items-center rounded-pill bg-tone-info-bg text-tone-info-fg">
            <ShieldAlert aria-hidden className="size-5" />
          </span>
          <h1 className="text-[1.25rem] leading-[1.3] font-semibold">
            You cannot report this deal yet
          </h1>
          <p className="text-[0.9375rem] leading-[1.75] text-ink-secondary">
            The other side is still inside the window the flow gives them. If the deadline passes with no progress, the report button appears by itself in the chat.
          </p>
          {deadline ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[0.75rem] text-ink-muted">{deadline.label}</p>
              <CountdownPill deadline={deadline} />
            </div>
          ) : null}
          <LinkButton variant="secondary" href={`/deals/${transactionId}`}>
            Back to the chat
          </LinkButton>
        </Surface>
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    // POST /reports
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show("Report submitted. An admin will review it and let you know.");
    router.push(`/deals/${transactionId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          Report a problem
        </h1>
        <p className="text-[0.875rem] text-ink-muted">
          {itemName} - with {counterparty}
        </p>
      </header>

      <RadioGroupField
        label="What went wrong"
        value={reason}
        onChange={setReason}
        variant="card"
      >
        {REASONS.map((r) => (
          <Radio key={r.id} value={r.id} description={r.description}>
            {r.label}
          </Radio>
        ))}
      </RadioGroupField>

      <TextAreaField
        label="Details"
        value={details}
        onChange={setDetails}
        rows={5}
        placeholder="Walk through what happened in order. The more detail, the faster an admin can decide."
        hint="Admins can already see the chat and slips on this deal. No need to attach them again."
      />

      <Surface shape="card" className="flex flex-col gap-3 p-4">
        <p className="text-[0.875rem] font-medium text-ink-secondary">
          Extra evidence
          <span className="ml-1 font-normal text-ink-muted">optional</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {evidence.map((src, i) => (
            <span
              key={src}
              className="rounded-chip bg-surface-sunken px-2 py-1 text-[0.75rem] shadow-sunken"
            >
              File {i + 1}
            </span>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onPress={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Attach an image
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) =>
            setEvidence((list) => [
              ...list,
              ...Array.from(e.target.files ?? []).map((f) => f.name),
            ])
          }
        />
      </Surface>

      <p className="rounded-control bg-tone-warning-bg p-3 text-[0.8125rem] leading-[1.6] text-tone-warning-fg">
        A false report counts against your own account. Only submit when you are sure.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onPress={() => router.back()}>
          Cancel
        </Button>
        <Button
          variant="danger"
          isDisabled={details.trim().length < 10}
          isLoading={busy}
          onPress={submit}
        >
          <Flag className="size-4" />
          Submit report
        </Button>
      </div>
    </div>
  );
}
