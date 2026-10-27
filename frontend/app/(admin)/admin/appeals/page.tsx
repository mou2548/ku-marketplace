import Link from "next/link";
import { Scale } from "lucide-react";

import {
  AdminBox,
  AdminPageHeader,
  AdminPill,
} from "@/components/admin/admin-ui";
import { EmptyState } from "@/components/kit/empty-state";
import {
  ADMIN_APPEAL_STATUS,
  isOpenAppeal,
  waitingFor,
} from "@/lib/admin-labels";
import { loadAdminQueues, requestTime } from "@/lib/admin";
import { formatDate } from "@/lib/date-format";

export const metadata = { title: "Appeals - Admin" };

/**
 * Open appeals first, oldest first; decided ones below, newest first. Each row
 * opens the appeal next to the verdict it contests.
 */
export default async function AdminAppealsPage() {
  const { appeals } = await loadAdminQueues();

  if (appeals.length === 0) {
    return (
      <EmptyState
        icon={<Scale className="size-6" />}
        title="No appeals waiting"
        description="Appeals against upheld reports land here, next to the verdict they contest."
      />
    );
  }

  const now = requestTime();
  const open = appeals
    .filter(isOpenAppeal)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const decided = appeals
    .filter((a) => !isOpenAppeal(a))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <AdminPageHeader
        title="Appeals"
        description={`${open.length} open. Re-check a decision using the appellant's evidence and the original reasoning.`}
      />
      {[
        { title: "Open", rows: open },
        { title: "Decided", rows: decided },
      ].map(({ title, rows }) =>
        rows.length ? (
          <AdminBox key={title} aria-label={`${title} appeals`}>
            <h2 className="px-4 py-3 text-body font-medium">{title}</h2>
            <ul className="border-t border-line">
              {rows.map((a) => {
                return (
                  <li
                    key={a.appeal_id}
                    className="border-b border-line last:border-b-0"
                  >
                    <Link
                      href={`/admin/appeals/${a.appeal_id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-sunken/60"
                    >
                      <span className="min-w-0">
                        <span className="font-medium text-ink">
                          Appeal #{a.appeal_id} · against report #{a.report_id}
                        </span>
                        <span className="block truncate text-meta text-ink-muted">
                          {a.appellant.name} · {a.report.reason_category} ·{" "}
                          {a.reason}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <AdminPill status={ADMIN_APPEAL_STATUS[a.status]} />
                        <span data-numeric className="text-meta text-ink-muted">
                          {isOpenAppeal(a)
                            ? `${waitingFor(a.created_at, now)} waiting`
                            : formatDate(new Date(a.created_at))}
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
