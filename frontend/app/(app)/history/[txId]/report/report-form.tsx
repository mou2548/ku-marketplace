"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flag, ShieldAlert } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { ChatMessagePicker } from "@/components/kit/chat-message-picker";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { EvidencePicker } from "@/components/kit/evidence-picker";
import { TextAreaField } from "@/components/kit/field";
import { EvidenceNote } from "@/components/kit/report-dialog";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { useStatusText } from "@/lib/status-text";
import { unwrapAction } from "@/lib/action-result";
import { createReport } from "@/lib/actions/reports";
import { isRefundOwedOnCancelled } from "@/lib/slip-state";
import { isReportDetailsValid, REPORT_DETAILS_MIN } from "@/lib/report-rules";
import { uploadFile } from "@/lib/actions/uploads";
import type { ChatMessage, Transaction } from "@/lib/api/types";
import {
  cancelResponseDeadline,
  isExpired,
  sellerConfirmDeadline,
  shippingDeadline,
  type Deadline,
} from "@/lib/status";

/**
 * §7.5.3's table — one reason, one precondition, one required evidence type.
 * `eligible` re-checks the precondition against the real transaction so a
 * reason that does not apply yet is disabled rather than trusted to the
 * reporter's judgment; `evidence` is shown as a hint, since admins already
 * have automatic access to the chat/slips (§7.1) and nothing here forces the
 * reporter to attach it separately.
 */
const REASONS: {
  id: string;
  label: string;
  /** "Occurs when" — §7.5.3's second column. */
  occursWhen: string;
  /** "Evidence required" — §7.5.3's third column. */
  evidence: string;
  eligible: (tx: Transaction) => boolean;
}[] = [
  {
    id: "no-payment-or-fake-slip",
    label: "Didn't pay, or a fake slip",
    occursWhen: "Confirming payment received is overdue (§4.5)",
    evidence: "The slip in question and the chat history",
    // `uploadPaymentSlip` (transaction.service.ts) sets `status: Processing`
    // and `payment_confirmed_by_buyer_at` in the same write — a transaction
    // is never `Pending` with a buyer-side payment timestamp already on it,
    // so that combination (what `deadlineFor` in lib/inbox.ts checks) can
    // never actually occur. The real "still waiting on the seller" window is
    // Processing with the buyer's slip in but no seller confirmation yet.
    eligible: (tx) =>
      tx.status === "Processing" &&
      !!tx.payment_confirmed_by_buyer_at &&
      !tx.payment_confirmed_by_seller_at &&
      isExpired(sellerConfirmDeadline(tx.payment_confirmed_by_buyer_at)),
  },
  {
    id: "no-shipment-or-pickup",
    label: "Didn't ship, or didn't show up to hand over",
    occursWhen: "Confirming shipment or handover is overdue (§4.5)",
    evidence: "The agreed meetup, or the tracking number on file",
    // Comes after payment is confirmed either way — `generateQr` (Meetup)
    // refuses until `payment_confirmed_by_seller_at` is set, and shipping's
    // own tracking number can't exist before that either — so this and
    // "no-payment-or-fake-slip" above are mutually exclusive windows, never
    // both eligible at once.
    eligible: (tx) =>
      tx.status === "Processing" &&
      !!tx.payment_confirmed_by_seller_at &&
      (tx.delivery_method === "Meetup" ||
        (!!tx.estimated_delivery_date &&
          isExpired(shippingDeadline(tx.estimated_delivery_date)))),
  },
  {
    id: "not-as-described",
    label: "Item doesn't match what was agreed, or is fake",
    occursWhen: "After the deal reaches Completed",
    evidence: "Photos of the real item next to the listing's photos",
    eligible: (tx) => tx.status === "Completed",
  },
  {
    id: "cancel-failed",
    label: "A cancellation request went nowhere",
    occursWhen:
      "During Processing, when the other side refused or never answered (§4.7)",
    evidence: "The cancellation request history — recorded automatically",
    eligible: (tx) =>
      tx.cancellation_response === "Rejected" ||
      (tx.status === "Pending Refund" &&
        !!tx.cancellation_requested_at &&
        isExpired(cancelResponseDeadline(tx.cancellation_requested_at))),
  },
  {
    id: "refund-not-received",
    label: "Agreed to a refund, then it never came",
    occursWhen: "After both sides agreed to cancel and to refund it themselves",
    evidence: "The chat history where the refund was agreed",
    eligible: (tx) => isRefundOwedOnCancelled(tx),
  },
];

export function ReportForm({
  transaction,
  transactionId,
  itemName,
  counterparty,
  allowed,
  deadline,
  messages,
  viewerId,
}: {
  transaction: Transaction;
  transactionId: number;
  itemName: string;
  counterparty: string;
  allowed: boolean;
  deadline?: Deadline;
  /** The deal's chat; undefined when it could not be loaded. */
  messages?: ChatMessage[];
  viewerId: number;
}) {
  const st = useStatusText();
  const router = useRouter();
  const toast = useToast();

  const eligibility = new Map(REASONS.map((r) => [r.id, r.eligible(transaction)]));
  const firstEligible = REASONS.find((r) => eligibility.get(r.id))?.id ?? REASONS[0].id;

  const [reason, setReason] = useState(firstEligible);
  const [details, setDetails] = useState("");
  const [evidence, setEvidence] = useState<File[]>([]);
  const [messageIds, setMessageIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  // R2: not an error page. The user is worried; tell them exactly when they can
  // act and let them go back with that answer.
  if (!allowed) {
    return (
      <div className="flex w-full max-w-xl flex-col gap-4">
        <Surface shape="card" className="flex flex-col gap-3 p-5">
          <span className="grid size-11 place-items-center rounded-pill bg-tone-info-bg text-tone-info-fg">
            <ShieldAlert aria-hidden className="size-5" />
          </span>
          <h1 className="text-[1.25rem] leading-[1.3] font-semibold">
            You cannot report this deal yet
          </h1>
          <p className="text-body text-ink-secondary">
            The other side is still inside the window the flow gives them. If the deadline passes with no progress, the report button appears by itself in the chat.
          </p>
          {deadline ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-meta text-ink-muted">{st.key(deadline.labelKey)}</p>
              <CountdownPill deadline={deadline} />
            </div>
          ) : null}
          <LinkButton variant="secondary" href={`/history/${transactionId}`}>
            Back to the chat
          </LinkButton>
        </Surface>
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    try {
      const evidence_urls: string[] = [];
      for (const file of evidence) evidence_urls.push(await unwrapAction(uploadFile(file)));
      const label = REASONS.find((r) => r.id === reason)?.label ?? reason;
      await unwrapAction(createReport({
        report_type: "Transaction",
        target_id: transactionId,
        reason_category: label,
        details: details.trim(),
        evidence_urls: evidence_urls.length ? evidence_urls : undefined,
        evidence_message_ids: messageIds.length ? messageIds : undefined,
      }));
      toast.success("Report submitted. An admin will review it.");
      router.push(`/history/${transactionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-5">
      <Link
        href={`/history/${transactionId}`}
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to the chat
      </Link>

      <header>
        <p className="text-overline font-semibold text-tone-danger-fg uppercase">
          Safety and support
        </p>
        <h1 className="mt-1 text-h1">Report a problem</h1>
        <p className="text-body-sm text-ink-muted">
          {itemName} - with {counterparty}
        </p>
      </header>

      <div className="max-w-xl">
        <RadioGroupField
        label="What went wrong"
        value={reason}
        onChange={setReason}
        variant="card"
      >
        {REASONS.map((r) => {
          const isEligible = eligibility.get(r.id) ?? false;
          return (
            <Radio
              key={r.id}
              value={r.id}
              isDisabled={!isEligible}
              description={
                isEligible
                  ? r.evidence
                  : `Not available yet — applies once: ${r.occursWhen.toLowerCase()}`
              }
            >
              {r.label}
            </Radio>
          );
        })}
        </RadioGroupField>
      </div>

      <TextAreaField
        label="Details"
        value={details}
        onChange={setDetails}
        rows={5}
        placeholder="Walk through what happened in order. The more detail, the faster an admin can decide."
        hint={`Required, at least ${REPORT_DETAILS_MIN} characters. Admins can see this deal's chat and slips, but not which part you mean. Point at it below.`}
        isRequired
      />

      <Surface shape="card" className="flex flex-col gap-4 p-4">
        <EvidenceNote canPickMessages />
        {messages ? (
          <ChatMessagePicker
            messages={messages}
            viewerId={viewerId}
            selected={messageIds}
            onChange={setMessageIds}
          />
        ) : (
          <p className="text-caption text-ink-muted">
            The chat could not be loaded, so messages cannot be picked right
            now. Reload the page to try again.
          </p>
        )}
        <EvidencePicker files={evidence} onChange={setEvidence} label="Photos" />
      </Surface>

      <p className="rounded-control bg-tone-warning-bg p-3 text-caption leading-[1.6] text-tone-warning-fg">
        A false report counts against your own account. Only submit when you are sure.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onPress={() => router.back()}>
          Cancel
        </Button>
        <Button
          variant="danger"
          isDisabled={!isReportDetailsValid(details) || !(eligibility.get(reason) ?? false)}
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
