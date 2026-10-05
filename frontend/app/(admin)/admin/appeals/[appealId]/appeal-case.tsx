"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminBox, AdminPill } from "@/components/admin/admin-ui";
import { TrustBadge } from "@/components/kit/trust-badge";
import { adminOpenAppeal } from "@/lib/actions/appeals";
import {
  ADMIN_APPEAL_STATUS,
  ADMIN_REPORT_STATUS,
  isOpenAppeal,
} from "@/lib/admin-labels";
import type { AdminAppeal, Sanction } from "@/lib/api/types";
import { formatDateTime } from "@/lib/date-format";

import { AppealDecision } from "../appeal-decision";

const SANCTION_LABEL: Record<Sanction, string> = {
  none: "No sanction",
  warn: "Warning",
  suspend_temporary: "Temporary suspension",
  suspend_permanent: "Permanent ban",
};

/**
 * One appeal next to the verdict it contests. Opening this screen is taking
 * the appeal on (`POST /admin/appeals/{id}/open`, from an effect so a link
 * prefetch never claims it). The flow has one admin lane, so whoever decided
 * the report also decides its appeal.
 */
export function AppealCase({ appeal: initialAppeal }: { appeal: AdminAppeal }) {
  const [appeal, setAppeal] = useState(initialAppeal);

  useEffect(() => {
    let live = true;
    adminOpenAppeal(initialAppeal.appeal_id)
      .then((opened) => {
        if (live) setAppeal(opened);
      })
      .catch(() => {
        // The case still reads correctly as listed; the claim is retried
        // the next time it is opened.
      });
    return () => {
      live = false;
    };
  }, [initialAppeal.appeal_id]);

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
                ? SANCTION_LABEL[report.sanction]
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

      {!isOpenAppeal(appeal) ? (
        <p className="rounded-[12px] border border-line px-4 py-3 text-body-sm text-ink-secondary">
          Already decided.
          {appeal.resolution_note ? ` Note: ${appeal.resolution_note}` : ""}
        </p>
      ) : (
        <AdminBox className="px-4 pb-4">
          <AppealDecision appealId={appeal.appeal_id} />
        </AdminBox>
      )}
    </div>
  );
}

function EvidenceGrid({
  urls,
  label,
}: {
  urls?: string[] | null;
  label: string;
}) {
  if (!urls?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-meta text-ink-muted">
        {label} ({urls.length})
      </p>
      <ul className="grid grid-cols-3 gap-2">
        {urls.map((url, index) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-[8px] bg-surface-sunken"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-only evidence view, arbitrary host */}
              <img
                src={url}
                alt={`${label}, photo ${index + 1}`}
                className="size-full object-cover"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
