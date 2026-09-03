import { Scale } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { adminListAppeals } from "@/lib/api/appeals";
import { APPEAL_STATUS } from "@/lib/status";

import { AppealDecision } from "./appeal-decision";

export const metadata = { title: "Appeals - Admin" };

export default async function AdminAppealsPage() {
  const appeals = await adminListAppeals();

  if (appeals.length === 0) {
    return (
      <EmptyState
        icon={<Scale className="size-6" />}
        title="No appeals waiting"
        description="Appeals against decisions land here. Whoever made the original decision should not be the one reviewing it."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Appeals
      </h1>

      <ul className="flex flex-col gap-3">
        {appeals.map((a) => (
          <li key={a.appeal_id}>
            <Surface shape="card" className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    Appeal #{a.appeal_id} · against report #{a.report_id}
                  </p>
                  <time
                    dateTime={a.created_at}
                    className="text-caption text-ink-muted"
                  >
                    {new Date(a.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </time>
                </div>
                <StatusBadge status={APPEAL_STATUS[a.status]} size="sm" />
              </div>

              <TrustBadge
                name={a.appellant.name}
                isVerified={a.appellant.isVerified}
                size="sm"
              />

              <p className="text-body text-ink-secondary">
                {a.reason}
              </p>

              {a.status === "Pending" || a.status === "Under_Review" ? (
                <AppealDecision appealId={a.appeal_id} />
              ) : (
                <p className="border-t border-line pt-3 text-caption leading-[1.6] text-ink-muted">
                  Already decided.{" "}
                  {a.resolution_note ? `Note: ${a.resolution_note}` : ""}
                </p>
              )}
            </Surface>
          </li>
        ))}
      </ul>
    </div>
  );
}
