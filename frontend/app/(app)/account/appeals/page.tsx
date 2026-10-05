import { formatDateTime, formatDate } from "@/lib/date-format";
import { getCopy } from "@/lib/copy";
import { redirect } from "next/navigation";
import { Scale } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import { getMyAppeals, getEligibleAppeals } from "@/lib/api/appeals";
import { getAccessToken } from "@/lib/api/session";
import { APPEAL_STATUS, REPORT_STATUS, type AppealStatus } from "@/lib/status";

export const metadata = { title: "My appeals - KU Marketplace" };

/** The order flow 2 moves an appeal through. There is no "not appealed" step
 * here — that is the absence of an `Appeal`, not a status one can hold. */
const APPEAL_FLOW: AppealStatus[] = ["Pending", "Under_Review", "Approved", "Rejected"];

/**
 * Flow 2, the student's side. A penalty with no visible way to answer it is
 * what turns a moderation decision into a grievance, so the appeal and its
 * state are a first-class screen rather than an email thread.
 */
export default async function MyAppealsPage() {
  const tStatus = await getCopy("status");
  if (!(await getAccessToken())) redirect("/login");
  const [appeals, eligible] = await Promise.all([getMyAppeals(), getEligibleAppeals()]);

  if (appeals.length === 0 && eligible.length === 0) {
    return (
      <EmptyState
        icon={<Scale className="size-6" />}
        title="You have no appeals"
        description="If a decision goes against you, you can appeal it here within the window stated in the decision."
      />
    );
  }

  /**
   * The states an appeal moves through, from the same map the badges use, so
   * "Appeal under review" beside a row means something without the reader
   * having to guess what comes after it.
   */
  const legend = (
    <Surface shape="card" className="flex flex-col gap-4 p-5">
      <p className="text-overline text-ink-muted uppercase">
        How an appeal moves
      </p>
      <ol className="flex flex-col gap-3">
        {APPEAL_FLOW.map((key) => {
          const state = APPEAL_STATUS[key];
          const stateText = {
            hint: state.hintKey ? tStatus(state.hintKey) : undefined,
          };
          return (
            <li key={key} className="flex flex-col gap-1">
              <StatusBadge status={state} size="sm" className="w-fit" />
              {stateText.hint ? (
                <p className="text-meta leading-[1.5] text-ink-muted">
                  {stateText.hint}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="border-t border-line pt-3 text-meta leading-[1.6] text-ink-muted">
        An admin reviews every appeal against the original reasoning and your
        new evidence.
      </p>
    </Surface>
  );

  return (
    <TwoColumn rail={legend}>
      <h1 className="text-h1">My appeals</h1>
      {eligible.map((report) => (
        <Surface key={report.report_id} shape="card" className="flex flex-col gap-2 p-4">
          <h2 className="font-semibold">Report #{report.report_id}: {report.reason_category}</h2>
          <p>{report.resolution_note}</p>
          <p className="text-caption text-ink-muted">Appeal by {formatDateTime(new Date(report.deadline))}. Use this report number in the appeal form.</p>
          <LinkButton href="/account/appeals/new" variant="secondary">Appeal this decision</LinkButton>
        </Surface>
      ))}

      <ul className="flex flex-col gap-2">
        {appeals.map((a) => (
          <li key={a.appeal_id}>
            <Surface shape="card" className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">Report #{a.report_id}</p>
                  <time
                    dateTime={a.created_at}
                    className="text-caption text-ink-muted"
                  >
                    Submitted{" "}
                    {formatDate(new Date(a.created_at))}
                  </time>
                </div>
                <StatusBadge status={APPEAL_STATUS[a.status]} size="sm" />
              </div>

              <p className="text-body-sm text-ink-secondary">
                {a.reason}
              </p>

              <p className="border-t border-line pt-3 text-caption leading-[1.6] text-ink-muted">
                An admin reviews this. Original verdict:{" "}
                {tStatus(REPORT_STATUS.Violation_Confirmed.labelKey)}.
              </p>
            </Surface>
          </li>
        ))}
      </ul>

      <LinkButton
        variant="secondary"
        href="/account/appeals/new"
        className="w-fit"
      >
        <Scale className="size-4" />
        Submit a new appeal
      </LinkButton>
    </TwoColumn>
  );
}
