"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminTakePanel } from "@/components/admin/admin-controls";
import {
  AdminBox,
  AdminPill,
  EvidenceGrid,
} from "@/components/admin/admin-ui";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { adminOpenAppeal } from "@/lib/actions/appeals";
import {
  ADMIN_APPEAL_STATUS,
  ADMIN_REPORT_STATUS,
  ADMIN_SANCTION,
} from "@/lib/admin-labels";
import type { ApiError } from "@/lib/api/client";
import type { AdminAppeal } from "@/lib/api/types";
import { formatDateTime } from "@/lib/date-format";

import { AppealDecision } from "../appeal-decision";

/**
 * One appeal next to the verdict it contests. As in the flow, the admin
 * presses "take the appeal" (กดรับยื่นอุทธรณ์) first, which moves it to Under
 * review; only then can it be decided. There is one admin, so whoever decided
 * the report also decides its appeal.
 */
export function AppealCase({ appeal: initialAppeal }: { appeal: AdminAppeal }) {
  const [appeal, setAppeal] = useState(initialAppeal);
  const toast = useToast();

  async function take() {
    try {
      setAppeal(await adminOpenAppeal(appeal.appeal_id));
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not take the appeal.");
    }
  }

  const { report } = appeal;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Link
        href="/admin/appeals"
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to appeals
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption text-ink-muted">
            Against report #{appeal.report_id}
          </p>
          <h1 className="mt-0.5 text-[1.75rem] font-medium leading-tight tracking-[-0.025em]">
            Appeal #{appeal.appeal_id}
          </h1>
        </div>
        <AdminPill status={ADMIN_APPEAL_STATUS[appeal.status]} />
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminBox
          aria-labelledby="appeal-side"
          className="flex flex-col gap-3 p-4"
        >
          <h2 id="appeal-side" className="text-body font-medium">
            The appeal
          </h2>
          <TrustBadge
            name={appeal.appellant.name}
            isVerified={appeal.appellant.isVerified}
            size="sm"
          />
          <p className="text-body-sm text-ink-secondary whitespace-pre-line">
            {appeal.reason}
          </p>
          <p className="text-meta text-ink-muted">
            Filed {formatDateTime(new Date(appeal.created_at))}
          </p>
          <EvidenceGrid
            urls={appeal.evidence_urls}
            label="Appellant's evidence"
          />
        </AdminBox>

        <AdminBox
          aria-labelledby="verdict-side"
          className="flex flex-col gap-3 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="verdict-side" className="text-body font-medium">
              The original verdict
            </h2>
            <AdminPill status={ADMIN_REPORT_STATUS[report.status]} />
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-body-sm">
            <dt className="text-ink-muted">Report</dt>
            <dd>
              <Link
                href={`/admin/reports/${report.report_id}`}
                className="font-medium text-ink-brand hover:underline"
              >
                #{report.report_id}
              </Link>{" "}
              · {report.report_type} #{report.target_id}
            </dd>
            <dt className="text-ink-muted">Reason</dt>
            <dd>{report.reason_category}</dd>
            <dt className="text-ink-muted">Sanction</dt>
            <dd>
              {report.sanction
                ? ADMIN_SANCTION[report.sanction]
                : "Not recorded"}
            </dd>
            <dt className="text-ink-muted">Decided by</dt>
            <dd>
              {report.handler?.name ?? "Unknown"}
              {report.handled_at
                ? `, ${formatDateTime(new Date(report.handled_at))}`
                : ""}
            </dd>
          </dl>
          {report.resolution_note ? (
            <p className="rounded-[10px] bg-surface-sunken px-3 py-2.5 text-body-sm text-ink-secondary whitespace-pre-line">
              {report.resolution_note}
            </p>
          ) : null}
          {report.details ? (
            <p className="text-meta text-ink-muted">
              Reporter wrote: {report.details}
            </p>
          ) : null}
          <EvidenceGrid
            urls={report.evidence_urls}
            label="Reporter's evidence"
          />
        </AdminBox>
      </div>

      {appeal.status === "Pending" ? (
        <AdminTakePanel
          title="Take this appeal"
          description="It moves to Under review and you can decide it."
          actionLabel="Take this appeal"
          onTake={take}
        />
      ) : appeal.status === "Under_Review" ? (
        <AppealDecision appealId={appeal.appeal_id} sanction={report.sanction} />
      ) : (
        <AdminBox className="flex flex-col gap-2 p-4">
          <h2 className="text-body font-medium">Decision</h2>
          <p className="text-body-sm text-ink-secondary">
            {appeal.status === "Approved"
              ? "Upheld. The sanction was lifted."
              : "Rejected. The sanction stands."}
            {appeal.handled_at
              ? ` ${formatDateTime(new Date(appeal.handled_at))}.`
              : ""}
          </p>
          {appeal.resolution_note ? (
            <p className="whitespace-pre-line rounded-[10px] bg-surface-sunken px-3 py-2.5 text-body-sm text-ink-secondary">
              {appeal.resolution_note}
            </p>
          ) : null}
        </AdminBox>
      )}
    </div>
  );
}
