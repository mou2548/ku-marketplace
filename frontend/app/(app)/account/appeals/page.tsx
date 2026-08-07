import { Scale } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { getAdminAppeals } from "@/lib/api/fixtures";
import { APPEAL_STATUS, REPORT_STATUS } from "@/lib/status";

export const metadata = { title: "My appeals - KU Marketplace" };

/**
 * Flow 2, the student's side. A penalty with no visible way to answer it is
 * what turns a moderation decision into a grievance, so the appeal and its
 * state are a first-class screen rather than an email thread.
 */
export default async function MyAppealsPage() {
  const appeals = await getAdminAppeals();

  if (appeals.length === 0) {
    return (
      <EmptyState
        icon={<Scale className="size-6" />}
        title="You have no appeals"
        description="If a decision goes against you, you can appeal it here within the window stated in the decision."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        My appeals
      </h1>

      <ul className="flex flex-col gap-2">
        {appeals.map((a) => (
          <li key={a.appeal_id}>
            <Surface shape="card" className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">Report #{a.report_id}</p>
                  <time
                    dateTime={a.created_at}
                    className="text-[0.8125rem] text-ink-muted"
                  >
                    Submitted{" "}
                    {new Date(a.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </time>
                </div>
                <StatusBadge status={APPEAL_STATUS[a.status]} size="sm" />
              </div>

              <p className="text-[0.875rem] leading-[1.7] text-ink-secondary">
                {a.reason}
              </p>

              <p className="border-t border-line pt-3 text-[0.8125rem] leading-[1.6] text-ink-muted">
                A different admin from the one who made the original decision
                reviews this. Original verdict:{" "}
                {REPORT_STATUS.Violation_Confirmed.label}.
              </p>
            </Surface>
          </li>
        ))}
      </ul>

      <LinkButton variant="secondary" href="/account/appeals/new">
        <Scale className="size-4" />
        Submit a new appeal
      </LinkButton>
    </div>
  );
}
