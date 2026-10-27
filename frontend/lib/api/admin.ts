import { apiFetch } from "./client";
import { authHeader } from "./session";
import type { PageResult } from "./sellers";
import type { MembershipTier } from "./membership";

/**
 * The admin overview endpoints (`backend/src/admin/`): sales figures, every
 * account, every deal, every item, every membership. Server-side reads, like
 * the rest of the admin workspace.
 */

export type AdminTransactionStatus =
  | "Pending"
  | "Processing"
  | "Completed"
  | "Cancelled"
  | "Pending Refund"
  | "Refunded";

export const ADMIN_TRANSACTION_STATUSES: AdminTransactionStatus[] = [
  "Pending",
  "Processing",
  "Completed",
  "Cancelled",
  "Pending Refund",
  "Refunded",
];

export type AccountStatus = "Active" | "Suspended" | "Banned" | "Deleted";

export interface AdminUserRef {
  user_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  status: AccountStatus | null;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface AdminOverview {
  range: DateRange;
  sales: {
    total_amount: number;
    completed_amount: number;
    ongoing_amount: number;
    transaction_count: number;
    completed_count: number;
    ongoing_count: number;
    units_completed: number;
    buy: { count: number; amount: number };
    trade: { count: number; amount: number };
  };
  by_status: Array<{
    status: AdminTransactionStatus;
    count: number;
    amount: number;
  }>;
  users: {
    total: number;
    new_in_range: number;
    active: number;
    suspended: number;
    banned: number;
    deleted: number;
  };
  memberships: Array<{ tier: MembershipTier; count: number }>;
  active_posts: number;
}

export interface TrendPoint {
  day: string;
  count: number;
  completed_count: number;
  amount: number;
}

export interface TopPost {
  post_id: number;
  post_type: string;
  status: string | null;
  price: number | null;
  item_id: number;
  item_name: string;
  category: string;
  image_url: string | null;
  seller: AdminUserRef;
  transaction_count: number;
  units: number;
  amount: number;
}

export interface AdminTransactionRow {
  transaction_id: number;
  created_at: string;
  /** Nullable in the schema; very old rows may have none. */
  status: AdminTransactionStatus | null;
  kind: "buy" | "trade";
  delivery_method: "Meetup" | "Shipping";
  quantity: number;
  total_amount: number;
  post_id: number;
  item_id: number;
  item_name: string;
  category: string;
  image_url: string | null;
  buyer: AdminUserRef;
  seller: AdminUserRef;
  /** The open system report freezing this deal, if any. */
  locking_report_id: number | null;
}

export interface AdminUserRow extends AdminUserRef {
  is_verified: boolean;
  created_at: string | null;
  tier: MembershipTier;
  item_count: number;
  sale_count: number;
  purchase_count: number;
}

export interface AdminUserDetail extends AdminUserRef {
  phone_number: string | null;
  promptpay_id: string | null;
  is_verified: boolean;
  created_at: string | null;
  follower_count: number;
  reports_filed: number;
  open_reports_against: number;
  suspension_ends_at: string | null;
  membership: {
    tier: MembershipTier;
    effective_tier: MembershipTier;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
    payments: Array<{
      payment_id: number;
      amount: number;
      status: string;
      slip_image_url: string;
      rejection_reason: string | null;
      created_at: string | null;
      handled_at: string | null;
    }>;
  } | null;
  items: Array<{
    item_id: number;
    name: string;
    category: string;
    quantity: number;
    status: string | null;
    created_at: string | null;
    image_url: string | null;
    post_count: number;
  }>;
  transactions: AdminTransactionRow[];
  verdicts: Array<{
    report_id: number;
    report_type: string;
    reason_category: string;
    sanction: string | null;
    resolution_note: string | null;
    handled_at: string | null;
  }>;
}

export interface AdminItemRow {
  item_id: number;
  name: string;
  category: string;
  condition: string;
  quantity: number;
  status: string | null;
  created_at: string | null;
  image_url: string | null;
  owner: AdminUserRef;
  active_post_count: number;
  units_completed: number;
}

export interface AdminItemDetail {
  item_id: number;
  name: string;
  category: string;
  condition: string;
  quantity: number;
  description: string | null;
  status: string | null;
  created_at: string | null;
  deleted_at: string | null;
  owner: AdminUserRef;
  images: string[];
  posts: Array<{
    post_id: number;
    post_type: string;
    status: string | null;
    price: number | null;
    quantity_total: number;
    quantity_remaining: number;
    created_at: string | null;
    deleted_at: string | null;
  }>;
  giveaways: Array<{
    giveaway_id: number;
    quantity: number;
    status: string | null;
    created_at: string | null;
  }>;
  transactions: AdminTransactionRow[];
}

export interface AdminSubscriptionRow {
  subscription_id: number;
  user: AdminUserRef;
  tier: MembershipTier;
  effective_tier: MembershipTier;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  posts_used_this_month: number;
  post_quota: number | null;
  latest_payment: {
    payment_id: number;
    amount: number;
    status: string;
    created_at: string | null;
  } | null;
}

export type AdminSanction = "suspend_temporary" | "suspend_permanent";

async function get<T>(path: string, query?: URLSearchParams): Promise<T> {
  const qs = query?.toString();
  return apiFetch<T>(qs ? `${path}?${qs}` : path, {
    headers: await authHeader(),
    cache: "no-store",
  });
}

const rangeQuery = (range?: Partial<DateRange>) =>
  new URLSearchParams(
    Object.entries(range ?? {}).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  );

export const getAdminOverview = (range?: Partial<DateRange>) =>
  get<AdminOverview>("/admin/stats/overview", rangeQuery(range));

export const getAdminTrend = (range?: Partial<DateRange>) =>
  get<{ range: DateRange; points: TrendPoint[] }>(
    "/admin/stats/trend",
    rangeQuery(range),
  );

export const getAdminTopPosts = (range?: Partial<DateRange>) =>
  get<{ range: DateRange; posts: TopPost[] }>(
    "/admin/stats/top-posts",
    rangeQuery(range),
  );

export const listAdminUsers = (query: URLSearchParams) =>
  get<PageResult<AdminUserRow>>("/admin/users", query);

export const getAdminUser = (userId: number) =>
  get<AdminUserDetail>(`/admin/users/${userId}`);

export const listAdminTransactions = (query: URLSearchParams) =>
  get<PageResult<AdminTransactionRow>>("/admin/transactions", query);

export const listAdminItems = (query: URLSearchParams) =>
  get<PageResult<AdminItemRow>>("/admin/items", query);

/** The categories items actually use (`GET /items/categories`). */
export const listItemCategories = () => get<string[]>("/items/categories");

export const getAdminItem = (itemId: number) =>
  get<AdminItemDetail>(`/admin/items/${itemId}`);

export const listAdminSubscriptions = (query: URLSearchParams) =>
  get<PageResult<AdminSubscriptionRow>>("/admin/subscriptions", query);

export async function suspendUser(
  userId: number,
  sanction: AdminSanction,
  reason: string,
) {
  return apiFetch<{ report_id: number; status: AccountStatus }>(
    `/admin/users/${userId}/suspend`,
    {
      method: "POST",
      headers: await authHeader(),
      body: { sanction, reason },
    },
  );
}

export async function reinstateUser(userId: number, note?: string) {
  return apiFetch<{ status: AccountStatus; reversed_report_ids: number[] }>(
    `/admin/users/${userId}/reinstate`,
    {
      method: "POST",
      headers: await authHeader(),
      body: note ? { note } : {},
    },
  );
}
