import Link from "next/link";

import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { adminListReports } from "@/lib/api/reports";
import { REPORT_STATUS } from "@/lib/status";

export const metadata = { title: "Reports - Admin" };

/**
 * Flow 2, the admin's side. Ordered oldest first: the queue's job is to stop
 * anything from being forgotten, and a newest-first list buries exactly the
 * cases that have been waiting longest.
 */
export default async function AdminReportsPage() {
  const reports = [...(await adminListReports())].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Reports
      </h1>

      <ul className="flex flex-col gap-2">
        {reports.map((r) => (
          <li key={r.report_id}>
            <Link href={`/admin/reports/${r.report_id}`}>
              <Surface
                as="div"
                shape="card"
                interactive
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    #{r.report_id} · {r.reason_category}
                  </p>
                  <p className="text-caption text-ink-muted">
                    {r.report_type} #{r.target_id}
                  </p>
                </div>

                <TrustBadge
                  name={r.reporter.name}
                  isVerified={r.reporter.isVerified}
                  size="sm"
                />

                <div className="flex shrink-0 items-center gap-2">
                  <time
                    dateTime={r.created_at}
                    className="text-meta text-ink-muted"
                  >
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </time>
                  <StatusBadge status={REPORT_STATUS[r.status]} size="sm" />
                </div>
              </Surface>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
