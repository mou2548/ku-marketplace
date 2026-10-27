import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  CreditCard,
  Gavel,
  Package,
  UserRound,
} from "lucide-react";

import {
  AdminBox,
  AdminBoxHeader,
  AdminFacts,
  AdminPageHeader,
  AdminPill,
} from "@/components/admin/admin-ui";
import {
  AdminTable,
  AdminTd,
  AdminTh,
  AdminUserCell,
} from "@/components/admin/admin-table";
import { ApiError } from "@/lib/api/client";
import { getAdminUser } from "@/lib/api/admin";
import type { Sanction } from "@/lib/api/types";
import {
  ADMIN_SANCTION,
  transactionStatusLabel,
  accountStatusLabel,
  formatBaht,
  formatCount,
} from "@/lib/admin-labels";
import { formatDate, formatDateTime } from "@/lib/date-format";

import { AccountActions } from "./account-actions";

export const metadata = { title: "User - Admin" };

const sanctionLabel = (sanction: string | null) =>
  sanction && sanction in ADMIN_SANCTION
    ? ADMIN_SANCTION[sanction as Sanction]
    : "Not recorded";

/** One member, from their standing down to each item and deal. */
export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const id = Number(userId);
  if (!Number.isInteger(id) || id < 1) notFound();
  const user = await getAdminUser(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const membership = user.membership;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Link
        href="/admin/users"
        className="inline-flex min-h-10 items-center gap-1.5 self-start text-body-sm text-ink-secondary hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All users
      </Link>

      <AdminPageHeader
        overline={`User #${user.user_id}`}
        title={user.name}
        description={user.email}
      >
        <div className="flex flex-wrap items-center gap-2">
          <AdminPill status={accountStatusLabel(user.status)} />
          <AccountActions
            userId={user.user_id}
            name={user.name}
            status={user.status}
          />
        </div>
      </AdminPageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminBox aria-labelledby="profile-title">
          <AdminBoxHeader
            icon={<UserRound />}
            title="Profile"
            titleId="profile-title"
          />
          <div className="border-t border-line px-4 py-3">
            <AdminFacts
              facts={[
                ["Joined", user.created_at ? formatDate(user.created_at) : "Unknown"],
                ["KU email", user.is_verified ? "Verified" : "Not verified"],
                ["Phone", user.phone_number ?? "Not given"],
                ["PromptPay", user.promptpay_id ?? "Not given"],
                ["Followers", formatCount(user.follower_count)],
                ["Reports filed", formatCount(user.reports_filed)],
                ["Open reports on them", formatCount(user.open_reports_against)],
                ...(user.suspension_ends_at
                  ? ([["Suspended until", formatDateTime(user.suspension_ends_at)]] as Array<
                      [string, string]
                    >)
                  : []),
              ]}
            />
          </div>
        </AdminBox>

        <AdminBox aria-labelledby="membership-title">
          <AdminBoxHeader
            icon={<CreditCard />}
            title="Membership"
            titleId="membership-title"
          />
          <div className="border-t border-line px-4 py-3">
            {membership ? (
              <AdminFacts
                facts={[
                  ["Tier in effect", membership.effective_tier],
                  ["Tier on record", membership.tier],
                  ["Status", membership.status ?? "Unknown"],
                  [
                    "Ends",
                    membership.end_date ? formatDate(membership.end_date) : "No end date",
                  ],
                ]}
              />
            ) : (
              <p className="text-body-sm text-ink-muted">
                No membership record. The account uses the Free tier.
              </p>
            )}
          </div>
          {membership?.payments.length ? (
            <AdminTable
              caption="Membership payments"
              minWidth={360}
              head={
                <>
                  <AdminTh>Sent</AdminTh>
                  <AdminTh align="right">Amount</AdminTh>
                  <AdminTh>Result</AdminTh>
                </>
              }
            >
              {membership.payments.map((payment) => (
                <tr key={payment.payment_id} className="border-t border-line">
                  <AdminTd numeric>
                    {payment.created_at ? formatDateTime(payment.created_at) : "Unknown"}
                  </AdminTd>
                  <AdminTd align="right" numeric>
                    {formatBaht(payment.amount)}
                  </AdminTd>
                  <AdminTd>
                    <a
                      href={payment.slip_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {payment.status}
                    </a>
                  </AdminTd>
                </tr>
              ))}
            </AdminTable>
          ) : null}
        </AdminBox>
      </div>

      <AdminBox aria-labelledby="verdicts-title">
        <AdminBoxHeader
          icon={<Gavel />}
          title="Confirmed verdicts against this account"
          titleId="verdicts-title"
        />
        <AdminTable
          caption="Confirmed verdicts"
          minWidth={560}
          empty={user.verdicts.length ? undefined : "No confirmed verdicts."}
          head={
            <>
              <AdminTh>Report</AdminTh>
              <AdminTh>Reason</AdminTh>
              <AdminTh>Penalty</AdminTh>
              <AdminTh>Decided</AdminTh>
            </>
          }
        >
          {user.verdicts.map((verdict) => (
            <tr key={verdict.report_id} className="border-t border-line">
              <AdminTd>
                <Link
                  href={`/admin/reports/${verdict.report_id}`}
                  className="font-medium hover:underline"
                >
                  #{verdict.report_id}
                </Link>
                <span className="block text-meta text-ink-muted">
                  {verdict.report_type}
                </span>
              </AdminTd>
              <AdminTd>
                {verdict.reason_category}
                {verdict.resolution_note ? (
                  <span className="block text-meta text-ink-muted">
                    {verdict.resolution_note}
                  </span>
                ) : null}
              </AdminTd>
              <AdminTd>{sanctionLabel(verdict.sanction)}</AdminTd>
              <AdminTd numeric>
                {verdict.handled_at ? formatDateTime(verdict.handled_at) : "Unknown"}
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      </AdminBox>

      <AdminBox aria-labelledby="items-title">
        <AdminBoxHeader icon={<Package />} title="Inventory" titleId="items-title">
          <Link
            href={`/admin/items?owner_id=${user.user_id}`}
            className="text-meta text-ink-brand hover:underline"
          >
            Open in Items
          </Link>
        </AdminBoxHeader>
        <AdminTable
          caption="Items this member owns"
          minWidth={520}
          empty={user.items.length ? undefined : "No items in this inventory."}
          head={
            <>
              <AdminTh>Item</AdminTh>
              <AdminTh align="right">Quantity</AdminTh>
              <AdminTh align="right">Listings</AdminTh>
              <AdminTh>Added</AdminTh>
            </>
          }
        >
          {user.items.map((item) => (
            <tr key={item.item_id} className="border-t border-line">
              <AdminTd>
                <Link
                  href={`/admin/items/${item.item_id}`}
                  className="font-medium hover:underline"
                >
                  {item.name}
                </Link>
                <span className="block text-meta text-ink-muted">
                  {item.category}
                  {item.status ? ` · ${item.status}` : ""}
                </span>
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(item.quantity)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(item.post_count)}
              </AdminTd>
              <AdminTd numeric>
                {item.created_at ? formatDate(item.created_at) : "Unknown"}
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      </AdminBox>

      <AdminBox aria-labelledby="deals-title">
        <AdminBoxHeader
          icon={<ArrowLeftRight />}
          title="Deals (latest 50)"
          titleId="deals-title"
        />
        <AdminTable
          caption="Deals this member bought or sold in"
          minWidth={720}
          empty={user.transactions.length ? undefined : "No deals yet."}
          head={
            <>
              <AdminTh>Deal</AdminTh>
              <AdminTh>Item</AdminTh>
              <AdminTh>Role</AdminTh>
              <AdminTh>Other party</AdminTh>
              <AdminTh align="right">Amount</AdminTh>
              <AdminTh>Status</AdminTh>
            </>
          }
        >
          {user.transactions.map((deal) => {
            const selling = deal.seller.user_id === user.user_id;
            return (
              <tr key={deal.transaction_id} className="border-t border-line">
                <AdminTd numeric>
                  #{deal.transaction_id}
                  <span className="block text-meta text-ink-muted">
                    {formatDateTime(deal.created_at)}
                  </span>
                </AdminTd>
                <AdminTd>
                  <Link
                    href={`/admin/items/${deal.item_id}`}
                    className="hover:underline"
                  >
                    {deal.item_name}
                  </Link>
                  <span className="block text-meta text-ink-muted">
                    {formatCount(deal.quantity)} ×{" "}
                    {deal.kind === "buy" ? "purchase" : "trade"}
                  </span>
                </AdminTd>
                <AdminTd>{selling ? "Seller" : "Buyer"}</AdminTd>
                <AdminTd>
                  <AdminUserCell user={selling ? deal.buyer : deal.seller} />
                </AdminTd>
                <AdminTd align="right" numeric>
                  {formatBaht(deal.total_amount)}
                </AdminTd>
                <AdminTd>
                  <AdminPill status={transactionStatusLabel(deal.status)} />
                </AdminTd>
              </tr>
            );
          })}
        </AdminTable>
      </AdminBox>
    </div>
  );
}
