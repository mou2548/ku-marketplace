"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gavel } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { TextAreaField } from "@/components/kit/field";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { adminResolveReport, adminRestoreReport } from "@/lib/actions/reports";
import type { ApiError } from "@/lib/api/client";
import type { AdminTransactionEvidence, Sanction } from "@/lib/api/reports";
import type { Report } from "@/lib/api/types";
import { APPOINTMENT_STATUS, REPORT_STATUS } from "@/lib/status";

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
    description: "Access is blocked until an admin lifts it.",
  },
  {
    id: "ban",
    label: "Ban permanently",
    description:
      "Access ends. History is kept, not deleted.",
  },
] as const;

type VerdictId = (typeof VERDICTS)[number]["id"];

const SANCTION_BY_VERDICT: Record<VerdictId, Sanction> = {
  dismiss: "none",
  warn: "warn",
  suspend: "suspend_temporary",
  ban: "suspend_permanent",
};

const APPEAL_WINDOW_DAYS = 7;
const MIN_NOTE = 30;

/**
 * The note is mandatory and long-form on purpose. It is sent to both parties
 * and becomes the basis of any appeal (flow 2), so a verdict recorded without
 * reasoning leaves the next admin with nothing to review.
 */
export function VerdictForm({
  report,
  evidence,
}: {
  report: Report;
  evidence?: AdminTransactionEvidence;
}) {
  const router = useRouter();
  const toast = useToast();
  const [verdict, setVerdict] = useState<VerdictId>("warn");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = note.trim().length < MIN_NOTE;
  const alreadyDecided = report.status !== "Pending" && report.status !== "Under_Investigation";

  async function decide() {
    setBusy(true);
    try {
      if (verdict === "dismiss") {
        await adminRestoreReport(report.report_id);
      } else {
        await adminResolveReport(report.report_id, {
          status: "Violation_Confirmed",
          sanction: SANCTION_BY_VERDICT[verdict],
          resolution_note: note,
        });
      }
      toast.show("Decision recorded and sent to both parties.");
      router.push("/admin/reports");
    } catch (error) {
      toast.show((error as ApiError).message ?? "Could not record the decision.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <Link
        href="/admin/reports"
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to reports
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
            Report #{report.report_id}
          </h1>
          <p className="text-[0.875rem] text-ink-muted">
            {report.reason_category} · {report.report_type} #{report.target_id}
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
        />
        {report.details ? (
          <p className="border-t border-line pt-3 text-[0.875rem] leading-[1.7] text-ink-secondary">
            {report.details}
          </p>
        ) : null}
      </Surface>

      {report.report_type === "Transaction" ? (
        <TransactionEvidence evidence={evidence} />
      ) : null}

      {alreadyDecided ? (
        <Surface shape="card" elevation="flat" className="bg-tone-info-bg p-4">
          <p className="text-[0.875rem] leading-[1.7] text-ink-secondary">
            This report was already decided (status: {REPORT_STATUS[report.status].label}).
            {report.resolution_note ? ` Note: ${report.resolution_note}` : ""}
          </p>
        </Surface>
      ) : (
        <>
          <RadioGroupField label="Decision" value={verdict} onChange={(v) => setVerdict(v as VerdictId)} variant="card">
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
        </>
      )}
    </div>
  );
}

/** §7.1/§7.5.3 — the evidence a Transaction report's admin actually has:
 * confirmation timestamps, the payment slip, the chat transcript, and any
 * appointment cards. Read-only — this is not the chat's own composer. */
function TransactionEvidence({ evidence }: { evidence?: AdminTransactionEvidence }) {
  if (!evidence) {
    return (
      <Surface shape="card" elevation="flat" className="bg-tone-warning-bg p-4">
        <p className="text-[0.875rem] leading-[1.7] text-ink-secondary">
          Could not load the transaction evidence for this report.
        </p>
      </Surface>
    );
  }

  const { transaction, messages, appointmentCards } = evidence;

  return (
    <Surface shape="card" className="flex flex-col gap-4 p-4">
      <p className="text-overline text-ink-muted uppercase">
        Transaction evidence
      </p>

      <dl className="grid grid-cols-2 gap-3 text-[0.8125rem]">
        <div>
          <dt className="text-ink-muted">Item</dt>
          <dd className="font-medium">{transaction.post.item.name}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Amount</dt>
          <dd data-numeric className="font-medium">
            ฿{transaction.final_amount.toLocaleString("en-GB")}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="font-medium">{transaction.delivery_method}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Status</dt>
          <dd className="font-medium">{transaction.status}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1 border-t border-line pt-3 text-[0.8125rem]">
        <p className="text-overline text-ink-muted uppercase">Confirmation timestamps</p>
        {[
          ["Buyer paid", transaction.payment_confirmed_by_buyer_at],
          ["Seller confirmed payment", transaction.payment_confirmed_by_seller_at],
          ["Buyer confirmed receipt", transaction.item_received_confirmed_by_buyer_at],
          ["Seller confirmed handover", transaction.item_received_confirmed_by_seller_at],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <span className="text-ink-muted">{label}</span>
            <span data-numeric>
              {value ? new Date(value).toLocaleString("en-GB") : "—"}
            </span>
          </div>
        ))}
      </div>

      {transaction.slip_image_url ? (
        <div className="border-t border-line pt-3">
          <p className="mb-2 text-overline text-ink-muted uppercase">Payment slip</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only evidence view, arbitrary host */}
          <img
            src={transaction.slip_image_url}
            alt="Payment slip"
            className="max-h-64 rounded-control object-contain"
          />
        </div>
      ) : null}

      {appointmentCards.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-overline text-ink-muted uppercase">Appointment cards</p>
          {appointmentCards.map((card) => (
            <div key={card.appointment_id} className="text-[0.8125rem]">
              <span className="font-medium">{card.date} {card.time}</span> ·{" "}
              {card.location} · proposed by {card.proposer.name} ·{" "}
              <StatusBadge status={APPOINTMENT_STATUS[card.status]} size="sm" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-overline text-ink-muted uppercase">
          Chat transcript ({messages.length})
        </p>
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.message_id} className="text-[0.8125rem]">
              <span className="font-medium">{m.sender?.name ?? `User #${m.sender_id}`}</span>
              {": "}
              {m.images_expired ? (
                <span className="italic text-ink-muted">(photo expired)</span>
              ) : m.image_urls?.length ? (
                <span className="italic text-ink-muted">
                  ({m.image_urls.length} photo{m.image_urls.length === 1 ? "" : "s"})
                </span>
              ) : null}
              {m.content}
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
}
