import { Crown } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { getMembershipRequests } from "@/lib/api/fixtures";

import { MembershipReview } from "./membership-review";

export const metadata = { title: "Memberships - Admin" };

/**
 * Same three-beat receipt as every other payment in the product (trust gap T2):
 * the student uploads a slip, an admin looks at it, an admin confirms. Reusing
 * the shape means an admin who has handled a deal dispute already knows what
 * this queue expects.
 */
export default async function AdminMembershipsPage() {
  const requests = await getMembershipRequests();

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Crown className="size-6" />}
        title="No membership slips waiting"
        description="Subscription slips appear here for checking before a tier is granted."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Membership requests
      </h1>

      <ul className="grid gap-3 md:grid-cols-2">
        {requests.map((r) => (
          <li key={r.request_id}>
            <Surface shape="card" className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <TrustBadge
                  name={r.user.name}
                  isVerified={r.user.isVerified}
                  faculty={r.user.faculty}
                  size="sm"
                />
                <span className="flex items-center gap-1.5 rounded-pill bg-amber-100 px-2.5 py-1 text-[0.75rem] font-semibold text-amber-700">
                  <Crown aria-hidden className="size-3.5" />
                  {r.tier}
                </span>
              </div>

              <MembershipReview
                requestId={r.request_id}
                slipUrl={r.slip_image_url}
                userName={r.user.name}
                tier={r.tier}
                createdAt={r.created_at}
              />
            </Surface>
          </li>
        ))}
      </ul>
    </div>
  );
}
