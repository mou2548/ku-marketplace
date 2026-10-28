import Link from "next/link";
import { Package } from "lucide-react";

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
import { listAdminItems, listItemCategories } from "@/lib/api/admin";
import { formatCount } from "@/lib/admin-labels";
import { formatDate } from "@/lib/date-format";

export const metadata = { title: "Items - Admin" };

/** Every member's inventory in one list, newest first. */
export default async function AdminItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters: Record<string, string> = {};
  const q = param(params, "q").trim();
  if (q) filters.q = q;
  const category = param(params, "category");
  if (category) filters.category = category;
  const owner = param(params, "owner_id");
  if (/^\d+$/.test(owner)) filters.owner_id = owner;
  const page = Math.max(1, Number(param(params, "page", "1")) || 1);
  const [result, categories] = await Promise.all([
    listAdminItems(new URLSearchParams({ ...filters, page: String(page) })),
    listItemCategories().catch(() => [] as string[]),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <AdminPageHeader
        title="Items"
        description="Every item in every member's inventory. Open one to see its listings and each deal made on it."
      />
      <AdminBox aria-labelledby="items-title">
        <AdminBoxHeader icon={<Package />} title="Inventory" titleId="items-title">
          {filters.owner_id ? (
            <Link href="/admin/items" className="text-meta text-ink-brand hover:underline">
              Show every owner
            </Link>
          ) : null}
        </AdminBoxHeader>
        <AdminFilterBar
          action="/admin/items"
          query={q}
          placeholder="Item name, number or owner email"
          selects={[
            {
              name: "category",
              label: "Category",
              value: category,
              options: [
                { value: "", label: "Any category" },
                ...categories.map((c) => ({ value: c, label: c })),
              ],
            },
          ]}
          hidden={filters.owner_id ? { owner_id: filters.owner_id } : undefined}
        />
        <AdminTable
          caption="Items"
          minWidth={760}
          empty={result.data.length ? undefined : "No item matches these filters."}
          head={
            <>
              <AdminTh>Item</AdminTh>
              <AdminTh>Owner</AdminTh>
              <AdminTh align="right">Quantity</AdminTh>
              <AdminTh align="right">Open listings</AdminTh>
              <AdminTh align="right">Units sold</AdminTh>
              <AdminTh>Added</AdminTh>
            </>
          }
        >
          {result.data.map((item) => (
            <tr
              key={item.item_id}
              className="border-t border-line hover:bg-surface-sunken/60"
            >
              <AdminTd>
                <Link
                  href={`/admin/items/${item.item_id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {item.name}
                </Link>
                <span className="block text-meta text-ink-muted">
                  #{item.item_id} · {item.category} · {item.condition}
                </span>
              </AdminTd>
              <AdminTd>
                <AdminUserCell user={item.owner} />
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(item.quantity)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(item.active_post_count)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(item.units_completed)}
              </AdminTd>
              <AdminTd numeric>
                {item.created_at ? formatDate(item.created_at) : "Unknown"}
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
        <AdminPagination
          path="/admin/items"
          params={filters}
          page={page}
          totalPages={result.meta.totalPages}
          total={result.meta.total}
        />
      </AdminBox>
    </div>
  );
}
