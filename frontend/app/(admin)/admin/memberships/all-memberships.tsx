import { Crown } from "lucide-react";

import {
  AdminBox,
  AdminBoxHeader,
  AdminPageHeader,
} from "@/components/admin/admin-ui";
import {
  AdminFilterBar,
  AdminPagination,
  AdminTable,
  AdminTd,
  AdminTh,
  AdminUserCell,
  param,
} from "@/components/admin/admin-table";
import { listAdminSubscriptions } from "@/lib/api/admin";
import { formatBaht, formatCount } from "@/lib/admin-labels";
import { formatDate } from "@/lib/date-format";

import { MembershipTabs } from "./membership-tabs";

const TIERS = ["all", "Free", "Silver", "Gold", "Diamond"] as const;

/** Every membership row: tier on record, tier in effect, quota use, last slip. */
export async function AllMemberships({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const apiFilters: Record<string, string> = {};
  const tier = param(params, "tier", "all");
  if (tier !== "all") apiFilters.tier = tier;
  const page = Math.max(1, Number(param(params, "page", "1")) || 1);
  const result = await listAdminSubscriptions(
    new URLSearchParams({ ...apiFilters, page: String(page) }),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <MembershipTabs current="all" />
      <AdminPageHeader
        title="All memberships"
        description="The tier on record can lag behind the tier in effect until the nightly expiry sweep runs."
      />
      <AdminBox aria-labelledby="subs-title">
        <AdminBoxHeader icon={<Crown />} title="Memberships" titleId="subs-title" />
        <AdminFilterBar
          action="/admin/memberships"
          hidden={{ tab: "all" }}
          selects={[
            {
              name: "tier",
              label: "Tier on record",
              value: tier,
              options: TIERS.map((t) => ({
                value: t,
                label: t === "all" ? "Any tier" : t,
              })),
            },
          ]}
        />
        <AdminTable
          caption="Memberships"
          minWidth={760}
          empty={result.data.length ? undefined : "No membership matches this filter."}
          head={
            <>
              <AdminTh>Member</AdminTh>
              <AdminTh>Tier in effect</AdminTh>
              <AdminTh>Ends</AdminTh>
              <AdminTh align="right">Posts this month</AdminTh>
              <AdminTh>Last payment</AdminTh>
            </>
          }
        >
          {result.data.map((sub) => (
            <tr key={sub.subscription_id} className="border-t border-line">
              <AdminTd>
                <AdminUserCell user={sub.user} />
              </AdminTd>
              <AdminTd>
                {sub.effective_tier}
                {sub.tier !== sub.effective_tier ? (
                  <span className="block text-meta text-ink-muted">
                    {sub.tier} on record, expired
                  </span>
                ) : null}
              </AdminTd>
              <AdminTd numeric>
                {sub.end_date ? formatDate(sub.end_date) : "No end date"}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(sub.posts_used_this_month)}
                {sub.post_quota === null ? " / unlimited" : ` / ${sub.post_quota}`}
              </AdminTd>
              <AdminTd>
                {sub.latest_payment ? (
                  <>
                    {formatBaht(sub.latest_payment.amount)} ·{" "}
                    {sub.latest_payment.status}
                    <span className="block text-meta text-ink-muted">
                      {sub.latest_payment.created_at
                        ? formatDate(sub.latest_payment.created_at)
                        : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-ink-muted">None</span>
                )}
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
        <AdminPagination
          path="/admin/memberships"
          params={{ ...apiFilters, tab: "all" }}
          page={page}
          totalPages={result.meta.totalPages}
          total={result.meta.total}
        />
      </AdminBox>
    </div>
  );
}
