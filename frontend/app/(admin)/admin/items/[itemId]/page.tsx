import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Gift, Package, Tag } from "lucide-react";

import {
  AdminBox,
  AdminBoxHeader,
  AdminFacts,
  AdminPageHeader,
  AdminPill,
  EvidenceGrid,
} from "@/components/admin/admin-ui";
import {
  AdminTable,
  AdminTd,
  AdminTh,
  AdminUserCell,
} from "@/components/admin/admin-table";
import { ApiError } from "@/lib/api/client";
import { getAdminItem } from "@/lib/api/admin";
import {
  transactionStatusLabel,
  formatBaht,
  formatCount,
} from "@/lib/admin-labels";
import { formatDate, formatDateTime } from "@/lib/date-format";

export const metadata = { title: "Item - Admin" };

/** One item: its owner, every listing and giveaway it backed, every deal. */
export default async function AdminItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const id = Number(itemId);
  if (!Number.isInteger(id) || id < 1) notFound();
  const item = await getAdminItem(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const sold = item.transactions
    .filter((t) => t.status === "Completed")
    .reduce((sum, t) => sum + t.quantity, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Link
        href="/admin/items"
        className="inline-flex min-h-10 items-center gap-1.5 self-start text-body-sm text-ink-secondary hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All items
      </Link>

      <AdminPageHeader
        overline={`Item #${item.item_id}`}
        title={item.name}
        description={`${item.category} · ${item.condition}`}
      >
        {item.deleted_at ? (
          <AdminPill status={{ label: "Deleted", tone: "neutral" }} />
        ) : null}
      </AdminPageHeader>

      <AdminBox aria-labelledby="item-title">
        <AdminBoxHeader icon={<Package />} title="Item" titleId="item-title" />
        <div className="grid gap-4 border-t border-line px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <AdminFacts
            facts={[
              ["Owner", <AdminUserCell key="owner" user={item.owner} />],
              ["In inventory", formatCount(item.quantity)],
              ["Units sold", formatCount(sold)],
              ["Status", item.status ?? "Unknown"],
              ["Added", item.created_at ? formatDate(item.created_at) : "Unknown"],
              ["Description", item.description || "None"],
            ]}
          />
          <EvidenceGrid urls={item.images} label="Photos" />
        </div>
      </AdminBox>

      <AdminBox aria-labelledby="posts-title">
        <AdminBoxHeader icon={<Tag />} title="Listings" titleId="posts-title" />
        <AdminTable
          caption="Listings made from this item"
          minWidth={560}
          empty={item.posts.length ? undefined : "This item was never listed."}
          head={
            <>
              <AdminTh>Listing</AdminTh>
              <AdminTh align="right">Price</AdminTh>
              <AdminTh align="right">Left / listed</AdminTh>
              <AdminTh>Status</AdminTh>
            </>
          }
        >
          {item.posts.map((post) => (
            <tr key={post.post_id} className="border-t border-line">
              <AdminTd>
                Post #{post.post_id}
                <span className="block text-meta text-ink-muted">
                  {post.post_type}
                  {post.created_at ? ` · ${formatDate(post.created_at)}` : ""}
                </span>
              </AdminTd>
              <AdminTd align="right" numeric>
                {post.price === null ? "Trade only" : formatBaht(post.price)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(post.quantity_remaining)} / {formatCount(post.quantity_total)}
              </AdminTd>
              <AdminTd>
                {post.deleted_at ? "Deleted" : (post.status ?? "Unknown")}
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      </AdminBox>

      {item.giveaways.length ? (
        <AdminBox aria-labelledby="giveaways-title">
          <AdminBoxHeader
            icon={<Gift />}
            title="Giveaways"
            titleId="giveaways-title"
          />
          <AdminTable
            caption="Giveaways made from this item"
            minWidth={400}
            head={
              <>
                <AdminTh>Giveaway</AdminTh>
                <AdminTh align="right">Quantity</AdminTh>
                <AdminTh>Status</AdminTh>
              </>
            }
          >
            {item.giveaways.map((g) => (
              <tr key={g.giveaway_id} className="border-t border-line">
                <AdminTd>
                  #{g.giveaway_id}
                  <span className="block text-meta text-ink-muted">
                    {g.created_at ? formatDate(g.created_at) : ""}
                  </span>
                </AdminTd>
                <AdminTd align="right" numeric>
                  {formatCount(g.quantity)}
                </AdminTd>
                <AdminTd>{g.status ?? "Unknown"}</AdminTd>
              </tr>
            ))}
          </AdminTable>
        </AdminBox>
      ) : null}

      <AdminBox aria-labelledby="deals-title">
        <AdminBoxHeader
          icon={<ArrowLeftRight />}
          title="Deals on this item"
          titleId="deals-title"
        />
        <AdminTable
          caption="Every deal made on this item's listings"
          minWidth={760}
          empty={item.transactions.length ? undefined : "No deals yet."}
          head={
            <>
              <AdminTh>Deal</AdminTh>
              <AdminTh>Buyer</AdminTh>
              <AdminTh align="right">Qty</AdminTh>
              <AdminTh align="right">Per unit</AdminTh>
              <AdminTh align="right">Amount</AdminTh>
              <AdminTh>Status</AdminTh>
            </>
          }
        >
          {item.transactions.map((deal) => (
            <tr key={deal.transaction_id} className="border-t border-line">
              <AdminTd numeric>
                #{deal.transaction_id}
                <span className="block text-meta text-ink-muted">
                  {formatDateTime(deal.created_at)} · Post #{deal.post_id} ·{" "}
                  {deal.kind === "buy" ? "Purchase" : "Trade"}
                </span>
              </AdminTd>
              <AdminTd>
                <AdminUserCell user={deal.buyer} />
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(deal.quantity)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {deal.kind === "buy" && deal.quantity > 0
                  ? formatBaht(deal.total_amount / deal.quantity)
                  : "Not applicable"}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatBaht(deal.total_amount)}
              </AdminTd>
              <AdminTd>
                <AdminPill status={transactionStatusLabel(deal.status)} />
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      </AdminBox>
    </div>
  );
}
