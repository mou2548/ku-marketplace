"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AdminTakePanel } from "@/components/admin/admin-controls";
import {
  AdminBox,
  AdminFacts,
  AdminPill,
  EvidenceGrid,
} from "@/components/admin/admin-ui";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { adminOpenReport } from "@/lib/actions/reports";
import {
  ADMIN_APPOINTMENT_STATUS,
  ADMIN_REPORT_STATUS,
  ADMIN_SANCTION,
} from "@/lib/admin-labels";
import type { ApiError } from "@/lib/api/client";
import type { AdminTransactionEvidence } from "@/lib/api/reports";
import type { Report } from "@/lib/api/types";
import { formatDateTime } from "@/lib/date-format";

import { ReportDecision } from "./report-decision";

/** Where an admin can look at what was reported. A transaction report
 * carries its evidence inline instead. */
const TARGET_HREF: Record<Report["report_type"], ((id: number) => string) | null> = {
  Post: (id) => `/market/${id}`,
  User: (id) => `/sellers/${id}`,
  Transaction: null,
};

/**
 * One report, laid out like the appeal case: what was reported on the left,
 * the evidence on the right, the decision underneath.
 *
 * The flow has the admin press "take the report" (กดรับการรายงาน) before
 * deciding, so a Pending report shows the evidence read-only with a Take
 * button; the decision form appears once it is Under investigation.
 */
export function ReportCase({
  report: initialReport,
  evidence,
}: {
  report: Report;
  evidence?: AdminTransactionEvidence;
}) {
  const [report, setReport] = useState(initialReport);
  const toast = useToast();
  const targetHref = TARGET_HREF[report.report_type]?.(report.target_id);

  async function take() {
    try {
      setReport(await adminOpenReport(report.report_id));
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not take the report.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Link
        href="/admin/reports"
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to reports
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption text-ink-muted">
            Reported {report.report_type.toLowerCase()} #{report.target_id}
          </p>
          <h1 className="mt-0.5 text-[1.75rem] font-medium leading-tight tracking-[-0.025em]">
            Report #{report.report_id}
          </h1>
        </div>
        <AdminPill status={ADMIN_REPORT_STATUS[report.status]} />
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminBox
          aria-labelledby="report-side"
          className="flex flex-col gap-3 p-4"
        >
          <h2 id="report-side" className="text-body font-medium">
            The report
          </h2>
          <TrustBadge
            name={report.reporter.name}
            isVerified={report.reporter.isVerified}
            size="sm"
          />
          <AdminFacts
            facts={[
              ["Reason", report.reason_category],
              ["Filed", formatDateTime(new Date(report.created_at))],
              [
                "Target",
                targetHref ? (
                  <a
                    href={targetHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-ink-brand hover:underline"
                  >
                    {report.report_type} #{report.target_id}
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                ) : (
                  `${report.report_type} #${report.target_id}`
                ),
              ],
            ]}
          />
          {report.details ? (
            <p className="whitespace-pre-line text-body-sm text-ink-secondary">
              {report.details}
            </p>
          ) : null}
          <EvidenceGrid
            urls={report.evidence_urls}
            label="Reporter's evidence"
          />
        </AdminBox>

        {report.report_type === "Transaction" ? (
          <TransactionEvidence evidence={evidence} />
        ) : (
          <AdminBox className="flex flex-col gap-2 p-4">
            <h2 className="text-body font-medium">Evidence</h2>
            <p className="text-body-sm text-ink-secondary">
              A {report.report_type.toLowerCase()} report has no deal attached.
              Check the reported {report.report_type.toLowerCase()} directly.
            </p>
            {targetHref ? (
              <a
                href={targetHref}
                target="_blank"
                rel="noreferrer"
                className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
              >
                Open the reported {report.report_type.toLowerCase()}
                <ExternalLink aria-hidden className="size-4" />
              </a>
            ) : null}
          </AdminBox>
        )}
      </div>

      {report.status === "Pending" ? (
        <AdminTakePanel
          title="Take this report"
          description="It moves to Under investigation and you can record a decision."
          actionLabel="Take this report"
          onTake={take}
        />
      ) : report.status === "Under_Investigation" ? (
        <ReportDecision reportId={report.report_id} />
      ) : (
        <DecidedSummary report={report} />
      )}
    </div>
  );
}

function DecidedSummary({ report }: { report: Report }) {
  const upheld = report.status === "Violation_Confirmed";
  return (
    <AdminBox className="flex flex-col gap-3 p-4">
      <h2 className="text-body font-medium">Decision</h2>
      <AdminFacts
        facts={[
          ["Verdict", upheld ? "Violation confirmed" : "Dismissed"],
          ...(upheld
            ? ([
                [
                  "Sanction",
                  report.sanction ? ADMIN_SANCTION[report.sanction] : "Not recorded",
                ],
              ] as Array<[string, React.ReactNode]>)
            : []),
          [
            "Decided",
            report.handled_at
              ? formatDateTime(new Date(report.handled_at))
              : "Unknown",
          ],
        ]}
      />
      {report.resolution_note ? (
        <p className="whitespace-pre-line rounded-[10px] bg-surface-sunken px-3 py-2.5 text-body-sm text-ink-secondary">
          {report.resolution_note}
        </p>
      ) : null}
    </AdminBox>
  );
}

/** What the admin has for a transaction report: the deal, its confirmation
 * times, the payment slip, appointment cards and the chat. Read-only. */
function TransactionEvidence({
  evidence,
}: {
  evidence?: AdminTransactionEvidence;
}) {
  if (!evidence) {
    return (
      <AdminBox className="p-4">
        <h2 className="text-body font-medium">Evidence</h2>
        <p className="mt-1 text-body-sm text-ink-secondary">
          The transaction evidence could not be loaded. Reload the page to try
          again.
        </p>
      </AdminBox>
    );
  }

  const { transaction, messages, appointmentCards } = evidence;
  const timeline: Array<[string, string | null | undefined]> = [
    ["Buyer paid", transaction.payment_confirmed_by_buyer_at],
    ["Seller confirmed payment", transaction.payment_confirmed_by_seller_at],
    ["Buyer confirmed receipt", transaction.item_received_confirmed_by_buyer_at],
    ["Seller confirmed handover", transaction.item_received_confirmed_by_seller_at],
  ];

  return (
    <AdminBox
      aria-labelledby="evidence-side"
      className="flex flex-col divide-y divide-line"
    >
      <div className="flex flex-col gap-3 p-4">
        <h2 id="evidence-side" className="text-body font-medium">
          Evidence
        </h2>
        <AdminFacts
          facts={[
            ["Item", transaction.post.item.name],
            [
              "Amount",
              <span key="amount" data-numeric>
                ฿{transaction.final_amount.toLocaleString("en-GB")}
              </span>,
            ],
            ["Delivery", transaction.delivery_method],
            ["Status", transaction.status],
          ]}
        />
      </div>

      <div className="flex flex-col gap-2 p-4">
        <p className="text-meta text-ink-muted">Confirmations</p>
        <ol className="flex flex-col gap-1 text-body-sm">
          {timeline.map(([label, value]) => (
            <li key={label} className="flex justify-between gap-3">
              <span className="text-ink-secondary">{label}</span>
              <span data-numeric className={value ? "text-ink" : "text-ink-muted"}>
                {value ? formatDateTime(new Date(value)) : "Not yet"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {transaction.slip_image_url ? (
        <div className="flex flex-col gap-2 p-4">
          <p className="text-meta text-ink-muted">Payment slip</p>
          {/* The box is reserved so the panel does not jump as the slip loads. */}
          <a
            href={transaction.slip_image_url}
            target="_blank"
            rel="noreferrer"
            className="block h-64 w-full overflow-hidden rounded-[8px] bg-surface-sunken"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-only evidence view, arbitrary host */}
            <img
              src={transaction.slip_image_url}
              alt="Payment slip"
              className="size-full object-contain"
            />
          </a>
        </div>
      ) : null}

      {appointmentCards.length > 0 ? (
        <div className="flex flex-col gap-2 p-4">
          <p className="text-meta text-ink-muted">Appointment cards</p>
          <ul className="flex flex-col gap-1.5 text-body-sm">
            {appointmentCards.map((card) => (
              <li
                key={card.appointment_id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="min-w-0 text-ink-secondary">
                  <span className="font-medium text-ink">
                    {card.date} {card.time}
                  </span>{" "}
                  · {card.location} · by {card.proposer.name}
                </span>
                <AdminPill status={ADMIN_APPOINTMENT_STATUS[card.status]} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 p-4">
        <p className="text-meta text-ink-muted">
          Chat transcript ({messages.length})
        </p>
        {messages.length === 0 ? (
          <p className="text-body-sm text-ink-muted">No messages.</p>
        ) : (
          <ol className="flex max-h-72 flex-col gap-1.5 overflow-y-auto text-body-sm">
            {messages.map((m) => (
              <li key={m.message_id}>
                <span className="font-medium text-ink">
                  {m.sender?.name ?? `User #${m.sender_id}`}
                </span>
                <span className="text-ink-muted">
                  {" "}
                  {formatDateTime(new Date(m.created_at))}
                </span>
                <p className="text-ink-secondary">
                  {m.images_expired ? (
                    <span className="italic text-ink-muted">(photo expired) </span>
                  ) : m.image_urls?.length ? (
                    <span className="italic text-ink-muted">
                      ({m.image_urls.length} photo
                      {m.image_urls.length === 1 ? "" : "s"}){" "}
                    </span>
                  ) : null}
                  {m.content}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AdminBox>
  );
}
