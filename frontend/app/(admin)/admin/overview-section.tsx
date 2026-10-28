import Link from "next/link";
import { ChartLine, Crown, Gauge, Trophy } from "lucide-react";

import {
  AdminBox,
  AdminBoxHeader,
  AdminPill,
} from "@/components/admin/admin-ui";
import {
  AdminTable,
  AdminTd,
  AdminTh,
  AdminUserCell,
} from "@/components/admin/admin-table";
import { SalesTrendChart } from "@/components/admin/sales-trend-chart";
import {
  getAdminOverview,
  getAdminTopPosts,
  getAdminTrend,
} from "@/lib/api/admin";
import {
  transactionStatusLabel,
  RANGE_PRESETS,
  formatBaht,
  formatCount,
  nameOr,
  presetRange,
  type RangePreset,
} from "@/lib/admin-labels";
import { cn } from "@/lib/utils";

const RANGE_DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const rangeLabel = (from: string, to: string) =>
  `${RANGE_DAY.format(new Date(`${from}T00:00:00Z`))} to ${RANGE_DAY.format(new Date(`${to}T00:00:00Z`))}`;

/**
 * The marketplace at a glance for the chosen range: the headline figures,
 * sales per day, how the deals stand, membership tiers and the listings that
 * moved the most. Sales volume is Completed plus in-flight deals (team ruling
 * 2026-10-27); a trade counts its cash top-up only.
 */
export async function OverviewSection({
  preset,
  now,
}: {
  preset: RangePreset;
  now: number;
}) {
  const range = presetRange(preset, now);
  const [overview, trend, top] = await Promise.all([
    getAdminOverview(range),
    getAdminTrend(range),
    getAdminTopPosts(range),
  ]);
  const { sales, users } = overview;

  return (
    <section aria-labelledby="overview-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="overview-title"
            className="text-body font-medium tracking-[-0.01em]"
          >
            Marketplace overview
          </h2>
          <p className="text-meta text-ink-muted">
            {rangeLabel(overview.range.from, overview.range.to)}, Bangkok time
          </p>
        </div>
        <nav
          aria-label="Date range"
          className="inline-flex max-w-full flex-wrap rounded-[8px] border border-line-default p-0.5"
        >
          {RANGE_PRESETS.map((p) => (
            <Link
              key={p.id}
              href={`/admin?range=${p.id}`}
              aria-current={p.id === preset ? "page" : undefined}
              scroll={false}
              className={cn(
                "touch-target inline-flex min-h-9 items-center rounded-[6px] px-2.5 text-meta transition-colors",
                p.id === preset
                  ? "bg-surface-sunken font-medium text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Sales volume"
          value={formatBaht(sales.total_amount)}
          detail={`${formatBaht(sales.completed_amount)} completed, ${formatBaht(sales.ongoing_amount)} in progress`}
        />
        <Tile
          label="Deals"
          value={formatCount(sales.transaction_count)}
          detail={`${formatCount(sales.buy.count)} purchases, ${formatCount(sales.trade.count)} trades`}
        />
        <Tile
          label="Units sold"
          value={formatCount(sales.units_completed)}
          detail={`in ${formatCount(sales.completed_count)} completed deals`}
        />
        <Tile
          label="Users"
          value={formatCount(users.total)}
          detail={`${formatCount(users.new_in_range)} new, ${formatCount(users.suspended + users.banned)} restricted`}
        />
      </dl>

      <AdminBox aria-labelledby="trend-title">
        <AdminBoxHeader
          icon={<ChartLine />}
          title="Sales volume per day"
          titleId="trend-title"
        >
          <span className="text-meta text-ink-muted">
            {formatCount(overview.active_posts)} listings open now
          </span>
        </AdminBoxHeader>
        <div className="px-4 pb-4">
          <SalesTrendChart points={trend.points} />
        </div>
      </AdminBox>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminBox aria-labelledby="status-title">
          <AdminBoxHeader
            icon={<Gauge />}
            title="Deals by status"
            titleId="status-title"
          >
            <Link
              href="/admin/transactions"
              className="touch-link text-meta text-ink-brand hover:underline"
            >
              All transactions
            </Link>
          </AdminBoxHeader>
          <AdminTable
            caption="Deals by status in the range"
            minWidth={320}
            head={
              <>
                <AdminTh>Status</AdminTh>
                <AdminTh align="right">Deals</AdminTh>
                <AdminTh align="right">Amount</AdminTh>
              </>
            }
          >
            {overview.by_status.map((row) => (
              <tr key={row.status} className="border-t border-line">
                <AdminTd>
                  <Link
                    href={`/admin/transactions?status=${encodeURIComponent(row.status)}&from=${overview.range.from}&to=${overview.range.to}`}
                    className="touch-link hover:underline"
                  >
                    <AdminPill status={transactionStatusLabel(row.status)} />
                  </Link>
                </AdminTd>
                <AdminTd align="right" numeric>
                  {formatCount(row.count)}
                </AdminTd>
                <AdminTd align="right" numeric>
                  {formatBaht(row.amount)}
                </AdminTd>
              </tr>
            ))}
          </AdminTable>
        </AdminBox>

        <AdminBox aria-labelledby="tiers-title">
          <AdminBoxHeader
            icon={<Crown />}
            title="Membership tiers"
            titleId="tiers-title"
          >
            <Link
              href="/admin/memberships?tab=all"
              className="touch-link text-meta text-ink-brand hover:underline"
            >
              All memberships
            </Link>
          </AdminBoxHeader>
          <AdminTable
            caption="Accounts per membership tier, right now"
            minWidth={280}
            head={
              <>
                <AdminTh>Tier</AdminTh>
                <AdminTh align="right">Accounts</AdminTh>
              </>
            }
          >
            {overview.memberships.map((row) => (
              <tr key={row.tier} className="border-t border-line">
                <AdminTd>{row.tier}</AdminTd>
                <AdminTd align="right" numeric>
                  {formatCount(row.count)}
                </AdminTd>
              </tr>
            ))}
          </AdminTable>
        </AdminBox>
      </div>

      <AdminBox aria-labelledby="top-title">
        <AdminBoxHeader
          icon={<Trophy />}
          title="Listings that moved the most"
          titleId="top-title"
        />
        <AdminTable
          caption="Listings ranked by units in the range"
          minWidth={600}
          empty={top.posts.length ? undefined : "No deals in this range yet."}
          head={
            <>
              <AdminTh>Listing</AdminTh>
              <AdminTh>Seller</AdminTh>
              <AdminTh align="right">Units</AdminTh>
              <AdminTh align="right">Deals</AdminTh>
              <AdminTh align="right">Amount</AdminTh>
            </>
          }
        >
          {top.posts.map((post) => (
            <tr key={post.post_id} className="border-t border-line">
              <AdminTd>
                <Link
                  href={`/admin/items/${post.item_id}`}
                  className="touch-link font-medium text-ink hover:underline"
                >
                  {nameOr(post.item_name, `Item #${post.item_id}`)}
                </Link>
                <span className="block text-meta text-ink-muted">
                  Post #{post.post_id} · {post.category}
                  {post.price !== null ? ` · ${formatBaht(post.price)}` : ""}
                </span>
              </AdminTd>
              <AdminTd>
                <AdminUserCell user={post.seller} />
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(post.units)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(post.transaction_count)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatBaht(post.amount)}
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      </AdminBox>
    </section>
  );
}

/** A headline figure: label, the number, one line of context. */
function Tile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[12px] border border-line bg-surface px-4 py-3">
      <dt className="text-meta text-ink-muted">{label}</dt>
      {/* No `truncate`: its clipping box cut the tops off the digits at this
          size, and on a 360px two-column grid it hid the end of the amount
          (audit P08). The figure wraps instead of disappearing. */}
      <dd
        data-numeric
        className="text-h2 font-semibold tracking-[-0.02em] text-ink wrap-anywhere"
      >
        {value}
      </dd>
      <dd className="text-meta text-ink-muted">{detail}</dd>
    </div>
  );
}
