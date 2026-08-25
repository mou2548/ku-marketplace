import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import { getAdminAppeals } from "@/lib/api/fixtures";
import { APPEAL_STATUS, REPORT_STATUS, type AppealStatus } from "@/lib/status";

export const metadata = { title: "My appeals - KU Marketplace" };

/**
 * The order flow 2 moves an appeal through. `Not_Appealed` is the absence of
 * an appeal, so it is not a step on this page.
 */
const APPEAL_FLOW: AppealStatus[] = [
  "Appeal_Submitted",
  "Appeal_Under_Review",
  "Appeal_Upheld",
  "Appeal_Rejected",
];

/**
 * Flow 2, the student's side. A penalty with no visible way to answer it is
 * what turns a moderation decision into a grievance, so the appeal and its
 * state are a first-class screen rather than an email thread.
 */
export default async function MyAppealsPage() {
  const appeals = await getAdminAppeals();

  if (appeals.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <Link
          href="/account"
          className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to account
        </Link>

        <EmptyState
          icon={<Scale className="size-6" />}
          title="You have no appeals"
          description="If a decision goes against you, you can appeal it here within the window stated in the decision."
        />
      </div>
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
          return (
            <li key={key} className="flex flex-col gap-1">
              <StatusBadge status={state} size="sm" className="w-fit" />
              {state.hint ? (
                <p className="text-[0.75rem] leading-[1.5] text-ink-muted">
                  {state.hint}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="border-t border-line pt-3 text-[0.75rem] leading-[1.6] text-ink-muted">
        A different admin from the one who made the original decision reviews
        every appeal.
      </p>
    </Surface>
  );

  return (
    <TwoColumn rail={legend}>
      <Link
        href="/account"
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to account
      </Link>

      <h1 className="text-h1">My appeals</h1>

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
