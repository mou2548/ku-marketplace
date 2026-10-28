import { redirect } from "next/navigation";
import { Crown } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { Surface } from "@/components/kit/surface";
import { listPendingPayments } from "@/lib/api/membership";
import { getAccessToken, isCurrentUserAdmin } from "@/lib/api/session";

import { AllMemberships } from "./all-memberships";
import { MembershipReview } from "./membership-review";
import { MembershipTabs } from "./membership-tabs";

export const metadata = { title: "Memberships - Admin" };

/**
 * Same three-beat receipt as every other payment in the product (trust gap T2):
 * the student uploads a slip, an admin looks at it, an admin confirms. Reusing
 * the shape means an admin who has handled a deal dispute already knows what
 * this queue expects.
 */
export default async function AdminMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await getAccessToken())) {
    redirect("/login");
  }
  if (!(await isCurrentUserAdmin())) {
    redirect("/feed");
  }

  const params = await searchParams;
  if (params.tab === "all") return <AllMemberships params={params} />;

  const requests = await listPendingPayments();

  if (requests.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <MembershipTabs current="pending" />
        <EmptyState
          icon={<Crown className="size-6" />}
          title="No membership slips waiting"
          description="Subscription slips appear here for checking before a tier is granted."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <MembershipTabs current="pending" />
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-overline font-semibold text-tone-warning-fg uppercase">
            Payment review
          </p>
          <h1 className="mt-1 text-h1">Membership requests</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-ink-muted">
            Match each transfer slip to the requested tier before granting access.
          </p>
        </div>
        <span data-numeric className="shrink-0 text-caption text-ink-muted">
          {requests.length} waiting
        </span>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        {requests.map((r) => (
          <li key={r.request_id}>
            <Surface shape="panel" className="overflow-hidden p-0">
              <div aria-hidden className="h-1 bg-tone-warning-solid" />
              <div className="flex items-center justify-between gap-2 px-4 pt-4">
                <span className="text-overline text-ink-muted uppercase">
                  Request #{r.request_id}
                </span>
                <span className="flex items-center gap-1.5 rounded-pill border border-tone-warning-border bg-tone-warning-bg px-2.5 py-1 text-meta font-semibold text-tone-warning-fg">
                  <Crown aria-hidden className="size-3.5" />
                  {r.tier}
                </span>
              </div>

              <div className="p-4 pt-3">
                <MembershipReview
                  requestId={r.request_id}
                  slipUrl={r.slip_image_url}
                  userName={r.user.name}
                  tier={r.tier}
                  amount={r.amount}
                  createdAt={r.created_at}
                />
              </div>
            </Surface>
          </li>
        ))}
      </ul>
    </div>
  );
}
