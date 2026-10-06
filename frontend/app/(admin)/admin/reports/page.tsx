import Link from "next/link";
import { Flag } from "lucide-react";

import {
  AdminBox,
  AdminPageHeader,
  AdminPill,
} from "@/components/admin/admin-ui";
import { EmptyState } from "@/components/kit/empty-state";
import { ADMIN_REPORT_STATUS, isOpenReport, waitingFor } from "@/lib/admin-labels";
import { loadAdminQueues, requestTime } from "@/lib/admin";
import { formatDate } from "@/lib/date-format";

export const metadata = { title: "Reports - Admin" };

/**
 * Flow 2, the admin's side. Open reports oldest first, because the queue's job
 * is to stop anything from being forgotten; decided ones below, newest first.
 * A report is taken from its case screen.
 */
export default async function AdminReportsPage() {
  const { reports } = await loadAdminQueues();

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<Flag className="size-6" />}
        title="No reports yet"
        description="Reports filed by students, and the ones the system opens when a deal stalls, land here."
      />
    );
  }

  const now = requestTime();
  const open = reports
    .filter(isOpenReport)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const decided = reports
    .filter((r) => !isOpenReport(r))
    .sort(
      (a, b) =>
        Date.parse(b.handled_at ?? b.created_at) -
        Date.parse(a.handled_at ?? a.created_at),
    );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <AdminPageHeader
        title="Reports"
        description={`${open.length} open. Oldest cases appear first so nothing is left behind.`}
      />
      {[
        { title: "Open", rows: open },
        { title: "Decided", rows: decided },
      ].map(({ title, rows }) =>
        rows.length ? (
          <AdminBox key={title} aria-label={`${title} reports`}>
            <h2 className="px-4 py-3 text-body font-medium">{title}</h2>
            <ul className="border-t border-line">
              {rows.map((r) => {
                return (
                  <li
                    key={r.report_id}
                    className="border-b border-line last:border-b-0"
                  >
                    <Link
                      href={`/admin/reports/${r.report_id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-sunken/60"
                    >
                      <span className="min-w-0">
                        <span className="font-medium text-ink">
                          Report #{r.report_id} · {r.reason_category}
                        </span>
                        <span className="block truncate text-meta text-ink-muted">
                          {r.report_type} #{r.target_id} · by {r.reporter.name}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <AdminPill status={ADMIN_REPORT_STATUS[r.status]} />
                        <span data-numeric className="text-meta text-ink-muted">
                          {isOpenReport(r)
                            ? `${waitingFor(r.created_at, now)} waiting`
                            : formatDate(
                                new Date(r.handled_at ?? r.created_at),
                              )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </AdminBox>
        ) : null,
      )}
    </div>
  );
}
