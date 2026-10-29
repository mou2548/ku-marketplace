import Link from "next/link";
import { Users } from "lucide-react";

import {
  AdminBox,
  AdminBoxHeader,
  AdminInitials,
  AdminPageHeader,
  AdminPill,
} from "@/components/admin/admin-ui";
import {
  AdminFilterBar,
  AdminPagination,
  AdminTable,
  AdminTd,
  AdminTh,
  param,
} from "@/components/admin/admin-table";
import { listAdminUsers } from "@/lib/api/admin";
import { accountStatusLabel, formatCount, nameOr } from "@/lib/admin-labels";
import { formatDate } from "@/lib/date-format";

export const metadata = { title: "Users - Admin" };

const STATUSES = ["all", "Active", "Suspended", "Banned", "Deleted"] as const;

/** Every member account (admins are not listed), newest first. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters: Record<string, string> = {};
  const q = param(params, "q").trim();
  if (q) filters.q = q;
  const status = param(params, "status", "all");
  if (status !== "all") filters.status = status;
  const page = Math.max(1, Number(param(params, "page", "1")) || 1);
  const result = await listAdminUsers(
    new URLSearchParams({ ...filters, page: String(page) }),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <AdminPageHeader
        title="Users"
        description="Every member account. Open one to see its items, deals and standing, or to suspend it."
      />
      <AdminBox aria-labelledby="users-title">
        <AdminBoxHeader icon={<Users />} title="Members" titleId="users-title" />
        <AdminFilterBar
          action="/admin/users"
          query={q}
          placeholder="Name, email or user number"
          selects={[
            {
              name: "status",
              label: "Account",
              value: status,
              options: STATUSES.map((s) => ({
                value: s,
                label: s === "all" ? "Any status" : s,
              })),
            },
          ]}
        />
        <AdminTable
          caption="Member accounts"
          minWidth={760}
          empty={result.data.length ? undefined : "No account matches these filters."}
          head={
            <>
              <AdminTh>Member</AdminTh>
              <AdminTh>Tier</AdminTh>
              <AdminTh align="right">Items</AdminTh>
              <AdminTh align="right">Sales</AdminTh>
              <AdminTh align="right">Purchases</AdminTh>
              <AdminTh>Joined</AdminTh>
              <AdminTh>Account</AdminTh>
            </>
          }
        >
          {result.data.map((user) => (
            <tr
              key={user.user_id}
              className="border-t border-line hover:bg-surface-sunken/60"
            >
              <AdminTd>
                <Link
                  href={`/admin/users/${user.user_id}`}
                  className="touch-link flex min-w-0 items-center gap-2.5"
                >
                  <AdminInitials name={user.name} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink hover:underline">
                      {nameOr(user.name, `User #${user.user_id}`)}
                    </span>
                    <span className="block truncate text-meta text-ink-muted">
                      {user.email}
                    </span>
                  </span>
                </Link>
              </AdminTd>
              <AdminTd>{user.tier}</AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(user.item_count)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(user.sale_count)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(user.purchase_count)}
              </AdminTd>
              <AdminTd numeric>
                {user.created_at ? formatDate(user.created_at) : "Unknown"}
              </AdminTd>
              <AdminTd>
                <AdminPill status={accountStatusLabel(user.status)} />
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
        <AdminPagination
          path="/admin/users"
          params={filters}
          page={page}
          totalPages={result.meta.totalPages}
          total={result.meta.total}
        />
      </AdminBox>
    </div>
  );
}
