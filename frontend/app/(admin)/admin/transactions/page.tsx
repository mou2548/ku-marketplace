import { ArrowLeftRight } from "lucide-react";

import {
  AdminBox,
  AdminBoxHeader,
  AdminPageHeader,
} from "@/components/admin/admin-ui";
import {
  AdminFilterBar,
  AdminPagination,
  param,
} from "@/components/admin/admin-table";
import {
  ADMIN_TRANSACTION_STATUSES,
  listAdminTransactions,
} from "@/lib/api/admin";
import { ADMIN_TRANSACTION_STATUS } from "@/lib/admin-labels";

import { LiveTransactions } from "./live-transactions";

export const metadata = { title: "Transactions - Admin" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Every deal in the marketplace, newest first, kept live by polling. */
export default async function AdminTransactionsPage({
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
  for (const key of ["from", "to"] as const) {
    const value = param(params, key);
    if (DAY.test(value)) filters[key] = value;
  }
  const page = Math.max(1, Number(param(params, "page", "1")) || 1);
  const query = new URLSearchParams({ ...filters, page: String(page) });
  const initial = await listAdminTransactions(query);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <AdminPageHeader
        title="Transactions"
        description="Every purchase and trade in the marketplace. Amounts are what the buyer pays: a trade counts only its cash top-up."
      />
      <AdminBox aria-labelledby="deals-title">
        <AdminBoxHeader
          icon={<ArrowLeftRight />}
          title="All deals"
          titleId="deals-title"
        />
        <AdminFilterBar
          action="/admin/transactions"
          query={q}
          placeholder="Deal number, item name or email"
          selects={[
            {
              name: "status",
              label: "Status",
              value: status,
              options: [
                { value: "all", label: "Any status" },
                ...ADMIN_TRANSACTION_STATUSES.map((s) => ({
                  value: s,
                  label: ADMIN_TRANSACTION_STATUS[s].label,
                })),
              ],
            },
          ]}
        />
        {filters.from || filters.to ? (
          <p className="px-4 pb-2 text-meta text-ink-muted">
            Created {filters.from ?? filters.to} to {filters.to ?? "today"}
          </p>
        ) : null}
        <LiveTransactions
          key={query.toString()}
          initial={initial}
          query={query.toString()}
        />
        <AdminPagination
          path="/admin/transactions"
          params={filters}
          page={page}
          totalPages={initial.meta.totalPages}
          total={initial.meta.total}
        />
      </AdminBox>
    </div>
  );
}
