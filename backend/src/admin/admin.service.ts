import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { Paginated } from '../dto/paginated.dto';
import { displayName } from '../common/utils/display-name';
import { TransactionStatus } from '../common/enums/transaction.enums';
import {
  ReportStatus,
  ReportType,
  Sanction,
} from '../common/enums/report.enums';
import {
  MembershipTier,
  MEMBERSHIP_CONFIG,
} from '../common/constants/membership.constant';
import { findLockingReports } from '../transaction/transaction-state';
import { suspensionEndsAt, verdictsAgainst } from '../report/account-standing';

/**
 * Sales volume counts every deal that is going ahead or has gone through
 * (team ruling 2026-10-27): Completed plus the two in-flight states. A
 * cancelled or refunded deal never earned anything, and `Pending Refund` is
 * money on its way back, so those three stay out. A trade counts only its
 * cash top-up, which is what `total_amount` holds for it.
 */
const SALES_STATUSES = [
  TransactionStatus.Completed,
  TransactionStatus.Pending,
  TransactionStatus.Processing,
];
const ONGOING_STATUSES = [
  TransactionStatus.Pending,
  TransactionStatus.Processing,
];

/** Days are Bangkok days: a deal at 01:00 on the 5th (UTC+7) is the 5th. */
const TIME_ZONE = 'Asia/Bangkok';
const UTC_OFFSET = '+07:00';
const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 366;

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();
const range = z.object({ from: isoDay, to: isoDay });
const pagination = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const usersQuery = pagination.extend({
  q: z.string().trim().max(150).default(''),
  status: z
    .enum(['all', 'Active', 'Suspended', 'Banned', 'Deleted'])
    .default('all'),
});
const transactionsQuery = pagination.extend({
  q: z.string().trim().max(150).default(''),
  status: z
    .enum(['all', ...Object.values(TransactionStatus)] as [string, ...string[]])
    .default('all'),
  from: isoDay,
  to: isoDay,
});
const itemsQuery = pagination.extend({
  q: z.string().trim().max(150).default(''),
  category: z.string().trim().max(50).default(''),
  owner_id: z.coerce.number().int().positive().optional(),
});
const subscriptionsQuery = pagination.extend({
  tier: z.enum(['all', 'Free', 'Silver', 'Gold', 'Diamond']).default('all'),
  status: z.string().trim().max(20).default('all'),
});
const topPostsQuery = range.extend({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException('Invalid query parameters');
  return result.data;
}

const startOfDay = (day: string) => new Date(`${day}T00:00:00${UTC_OFFSET}`);
const bangkokDay = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);

/** `from`/`to` are inclusive Bangkok days; the default is the last 30. */
function resolveRange(query: { from?: string; to?: string }) {
  const to = query.to ?? bangkokDay(new Date());
  const from =
    query.from ?? bangkokDay(new Date(startOfDay(to).getTime() - 29 * DAY_MS));
  const start = startOfDay(from);
  const end = new Date(startOfDay(to).getTime() + DAY_MS);
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (days < 1 || days > MAX_RANGE_DAYS)
    throw new BadRequestException(
      `The range must cover 1 to ${MAX_RANGE_DAYS} days`,
    );
  return { from, to, start, end, days };
}

const money = (value: Prisma.Decimal | number | null | undefined) =>
  Number(value ?? 0);

const userSummarySelect = {
  userId: true,
  email: true,
  firstNameEn: true,
  lastNameEn: true,
  firstNameTh: true,
  lastNameTh: true,
  avatarUrl: true,
  status: true,
} satisfies Prisma.UserSelect;
type UserSummaryRow = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;
const userSummary = (user: UserSummaryRow) => ({
  user_id: user.userId,
  name: displayName(user) || user.email,
  email: user.email,
  avatar_url: user.avatarUrl,
  status: user.status,
});

const primaryImage = {
  where: { status: 'Active' },
  orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
  take: 1,
  select: { imageUrl: true },
} satisfies Prisma.Item$imagesArgs;

const transactionRowInclude = {
  buyer: { select: userSummarySelect },
  seller: { select: userSummarySelect },
  post: {
    select: {
      postId: true,
      postType: true,
      item: {
        select: {
          itemId: true,
          name: true,
          category: true,
          images: primaryImage,
        },
      },
    },
  },
} satisfies Prisma.TransactionInclude;
type TransactionRow = Prisma.TransactionGetPayload<{
  include: typeof transactionRowInclude;
}>;

function effectiveTier(subscription: {
  tier: string;
  status: string | null;
  endDate: Date | null;
}): MembershipTier {
  if (subscription.status !== 'Active' || subscription.tier === 'Free')
    return 'Free';
  if (!subscription.endDate || subscription.endDate.getTime() <= Date.now())
    return 'Free';
  return subscription.tier as MembershipTier;
}

/**
 * The admin's view over the whole marketplace: sales figures, every account,
 * every deal, every item. Read-only — suspending and reinstating an account
 * go through `ReportService` so they share the moderation rules.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(query: unknown) {
    const { from, to, start, end } = resolveRange(parse(range, query));
    const inRange = { createdAt: { gte: start, lt: end } };

    const [byStatus, byKind, quantity, users, newUsers, subscriptions, posts] =
      await Promise.all([
        this.prisma.transaction.groupBy({
          by: ['status'],
          where: inRange,
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.$queryRaw<
          { kind: 'buy' | 'trade'; count: bigint; amount: Prisma.Decimal }[]
        >(Prisma.sql`
          SELECT CASE WHEN offer_id IS NULL THEN 'buy' ELSE 'trade' END AS kind,
                 COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount
          FROM "Transaction"
          WHERE created_at >= ${start} AND created_at < ${end}
            AND transaction_status IN (${Prisma.join(SALES_STATUSES)})
          GROUP BY 1`),
        this.prisma.transaction.aggregate({
          where: { ...inRange, status: TransactionStatus.Completed },
          _sum: { quantity: true },
        }),
        this.prisma.user.groupBy({
          by: ['status'],
          where: { isAdmin: false },
          _count: { _all: true },
        }),
        this.prisma.user.count({ where: { isAdmin: false, ...inRange } }),
        this.prisma.subscription.findMany({
          where: { user: { isAdmin: false } },
          select: { tier: true, status: true, endDate: true },
        }),
        this.prisma.post.count({
          where: { status: 'Active', deletedAt: null },
        }),
      ]);

    const statusRow = (status: string) =>
      byStatus.find((row) => row.status === status);
    const sum = (statuses: string[], pick: 'count' | 'amount') =>
      statuses.reduce((total, status) => {
        const row = statusRow(status);
        return (
          total +
          (pick === 'count'
            ? (row?._count._all ?? 0)
            : money(row?._sum.totalAmount))
        );
      }, 0);
    const kind = (name: 'buy' | 'trade') => {
      const row = byKind.find((r) => r.kind === name);
      return { count: Number(row?.count ?? 0), amount: money(row?.amount) };
    };
    const userCount = (status: string) =>
      users.find((row) => row.status === status)?._count._all ?? 0;
    const tiers: Record<MembershipTier, number> = {
      Free: 0,
      Silver: 0,
      Gold: 0,
      Diamond: 0,
    };
    for (const subscription of subscriptions)
      tiers[effectiveTier(subscription)] += 1;

    return {
      range: { from, to },
      sales: {
        total_amount: sum(SALES_STATUSES, 'amount'),
        completed_amount: sum([TransactionStatus.Completed], 'amount'),
        ongoing_amount: sum(ONGOING_STATUSES, 'amount'),
        transaction_count: sum(SALES_STATUSES, 'count'),
        completed_count: sum([TransactionStatus.Completed], 'count'),
        ongoing_count: sum(ONGOING_STATUSES, 'count'),
        units_completed: quantity._sum.quantity ?? 0,
        buy: kind('buy'),
        trade: kind('trade'),
      },
      by_status: Object.values(TransactionStatus).map((status) => ({
        status,
        count: statusRow(status)?._count._all ?? 0,
        amount: money(statusRow(status)?._sum.totalAmount),
      })),
      users: {
        total: users.reduce((total, row) => total + row._count._all, 0),
        new_in_range: newUsers,
        active: userCount('Active'),
        suspended: userCount('Suspended'),
        banned: userCount('Banned'),
        deleted: userCount('Deleted'),
      },
      memberships: (Object.keys(tiers) as MembershipTier[]).map((tier) => ({
        tier,
        count: tiers[tier],
      })),
      active_posts: posts,
    };
  }

  /** One point per Bangkok day in the range, empty days included. */
  async trend(query: unknown) {
    const { from, to, start, end, days } = resolveRange(parse(range, query));
    const rows = await this.prisma.$queryRaw<
      {
        day: string;
        count: bigint;
        amount: Prisma.Decimal;
        completed_count: bigint;
      }[]
    >(Prisma.sql`
      SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${TIME_ZONE}, 'YYYY-MM-DD') AS day,
             COUNT(*) AS count,
             COALESCE(SUM(total_amount), 0) AS amount,
             COUNT(*) FILTER (WHERE transaction_status = ${TransactionStatus.Completed}) AS completed_count
      FROM "Transaction"
      WHERE created_at >= ${start} AND created_at < ${end}
        AND transaction_status IN (${Prisma.join(SALES_STATUSES)})
      GROUP BY 1`);
    const byDay = new Map(rows.map((row) => [row.day, row]));
    const points = Array.from({ length: days }, (_, i) => {
      const day = bangkokDay(new Date(start.getTime() + i * DAY_MS));
      const row = byDay.get(day);
      return {
        day,
        count: Number(row?.count ?? 0),
        completed_count: Number(row?.completed_count ?? 0),
        amount: money(row?.amount),
      };
    });
    return { range: { from, to }, points };
  }

  /** The listings that closed the most units in the range. */
  async topPosts(query: unknown) {
    const parsed = parse(topPostsQuery, query);
    const { from, to, start, end } = resolveRange(parsed);
    const groups = await this.prisma.transaction.groupBy({
      by: ['postId'],
      where: {
        createdAt: { gte: start, lt: end },
        status: { in: SALES_STATUSES },
      },
      _count: { _all: true },
      _sum: { quantity: true, totalAmount: true },
      orderBy: [{ _sum: { quantity: 'desc' } }, { postId: 'asc' }],
      take: parsed.limit,
    });
    const posts = await this.prisma.post.findMany({
      where: { postId: { in: groups.map((g) => g.postId) } },
      select: {
        postId: true,
        postType: true,
        price: true,
        status: true,
        item: {
          select: {
            itemId: true,
            name: true,
            category: true,
            images: primaryImage,
            owner: { select: userSummarySelect },
          },
        },
      },
    });
    const byId = new Map(posts.map((post) => [post.postId, post]));
    return {
      range: { from, to },
      posts: groups.flatMap((group) => {
        const post = byId.get(group.postId);
        if (!post) return [];
        return [
          {
            post_id: post.postId,
            post_type: post.postType,
            status: post.status,
            price: post.price === null ? null : money(post.price),
            item_id: post.item.itemId,
            item_name: post.item.name,
            category: post.item.category,
            image_url: post.item.images[0]?.imageUrl ?? null,
            seller: userSummary(post.item.owner),
            transaction_count: group._count._all,
            units: group._sum.quantity ?? 0,
            amount: money(group._sum.totalAmount),
          },
        ];
      }),
    };
  }

  async users(query: unknown) {
    const { page, limit, q, status } = parse(usersQuery, query);
    const where: Prisma.UserWhereInput = {
      isAdmin: false,
      ...(status !== 'all' && { status }),
      ...(q && {
        OR: [
          ...(/^\d+$/.test(q) ? [{ userId: Number(q) }] : []),
          { email: { contains: q, mode: 'insensitive' } },
          { firstNameEn: { contains: q, mode: 'insensitive' } },
          { lastNameEn: { contains: q, mode: 'insensitive' } },
          { firstNameTh: { contains: q, mode: 'insensitive' } },
          { lastNameTh: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { userId: 'desc' },
        select: {
          ...userSummarySelect,
          createdAt: true,
          emailVerifiedAt: true,
          subscriptions: {
            select: { tier: true, status: true, endDate: true },
            take: 1,
          },
          _count: {
            select: {
              items: { where: { deletedAt: null } },
              sales: true,
              purchases: true,
            },
          },
        },
      }),
    ]);
    return new Paginated(
      rows.map((user) => ({
        ...userSummary(user),
        is_verified: Boolean(user.emailVerifiedAt),
        created_at: user.createdAt,
        tier: user.subscriptions[0]
          ? effectiveTier(user.subscriptions[0])
          : 'Free',
        item_count: user._count.items,
        sale_count: user._count.sales,
        purchase_count: user._count.purchases,
      })),
      { page, limit, total, totalPages: Math.ceil(total / limit) },
    );
  }

  async user(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        ...userSummarySelect,
        isAdmin: true,
        phoneNumber: true,
        promptpayId: true,
        createdAt: true,
        emailVerifiedAt: true,
        subscriptions: {
          take: 1,
          include: { payments: { orderBy: { createdAt: 'desc' }, take: 10 } },
        },
        items: {
          where: { deletedAt: null },
          orderBy: { itemId: 'desc' },
          select: {
            itemId: true,
            name: true,
            category: true,
            quantity: true,
            status: true,
            createdAt: true,
            images: primaryImage,
            _count: {
              select: { posts: { where: { deletedAt: null } } },
            },
          },
        },
        _count: {
          select: {
            followers: { where: { deletedAt: null } },
            reportsFiled: true,
          },
        },
      },
    });
    if (!user || user.isAdmin)
      throw new NotFoundException(`User ${userId} not found`);

    const [transactions, verdicts, openReports] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        orderBy: [{ createdAt: 'desc' }, { transactionId: 'desc' }],
        take: 50,
        include: transactionRowInclude,
      }),
      verdictsAgainst(this.prisma, userId),
      this.openReportsAgainst(userId),
    ]);
    const locks = await findLockingReports(
      this.prisma,
      transactions.map((t) => t.transactionId),
    );
    const subscription = user.subscriptions[0];
    // Several temporary suspensions can overlap; the account is held until
    // the last of them runs out.
    const now = Date.now();
    const suspensionEnds = verdicts
      .filter((v) => v.sanction === Sanction.Suspend_Temporary && v.handledAt)
      .map((v) => suspensionEndsAt(v.handledAt!))
      .filter((end) => end.getTime() > now)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      ...userSummary(user),
      phone_number: user.phoneNumber,
      promptpay_id: user.promptpayId,
      is_verified: Boolean(user.emailVerifiedAt),
      created_at: user.createdAt,
      follower_count: user._count.followers,
      reports_filed: user._count.reportsFiled,
      open_reports_against: openReports,
      suspension_ends_at:
        user.status === 'Suspended' ? (suspensionEnds ?? null) : null,
      membership: subscription
        ? {
            tier: subscription.tier,
            effective_tier: effectiveTier(subscription),
            status: subscription.status,
            start_date: subscription.startDate,
            end_date: subscription.endDate,
            payments: subscription.payments.map((payment) => ({
              payment_id: payment.paymentId,
              amount: money(payment.amount),
              status: payment.status,
              slip_image_url: payment.slipImageUrl,
              rejection_reason: payment.rejectionReason,
              created_at: payment.createdAt,
              handled_at: payment.handledAt,
            })),
          }
        : null,
      items: user.items.map((item) => ({
        item_id: item.itemId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        status: item.status,
        created_at: item.createdAt,
        image_url: item.images[0]?.imageUrl ?? null,
        post_count: item._count.posts,
      })),
      transactions: transactions.map((t) =>
        this.transactionRow(t, locks.get(t.transactionId) ?? null),
      ),
      verdicts: verdicts.map((verdict) => ({
        report_id: verdict.reportId,
        report_type: verdict.reportType,
        reason_category: verdict.reasonCategory,
        sanction: verdict.sanction,
        resolution_note: verdict.resolutionNote,
        handled_at: verdict.handledAt,
      })),
    };
  }

  /** Pending or under-investigation reports of any type that are against
   * this user (their account, one of their posts, or a deal they are in). */
  private async openReportsAgainst(userId: number) {
    const [posts, transactions] = await Promise.all([
      this.prisma.post.findMany({
        where: { item: { ownerId: userId } },
        select: { postId: true },
      }),
      this.prisma.transaction.findMany({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        select: { transactionId: true },
      }),
    ]);
    const open = await this.prisma.report.findMany({
      where: {
        status: {
          in: [ReportStatus.Pending, ReportStatus.Under_Investigation],
        },
        OR: [
          { reportType: ReportType.User, targetId: userId },
          {
            reportType: ReportType.Post,
            targetId: { in: posts.map((p) => p.postId) },
          },
          {
            reportType: ReportType.Transaction,
            targetId: { in: transactions.map((t) => t.transactionId) },
            reporterId: { not: userId },
          },
        ],
      },
      select: { reportId: true },
    });
    return open.length;
  }

  /**
   * Every deal in the system, newest first. The screen polls this, so it is
   * one indexed page read plus the lock lookup for that page only.
   */
  async transactions(query: unknown) {
    const parsed = parse(transactionsQuery, query);
    const { page, limit, q, status } = parsed;
    const dates =
      parsed.from || parsed.to
        ? resolveRange({ from: parsed.from ?? parsed.to, to: parsed.to })
        : null;
    const where: Prisma.TransactionWhereInput = {
      ...(status !== 'all' && { status }),
      ...(dates && { createdAt: { gte: dates.start, lt: dates.end } }),
      ...(q && {
        OR: [
          ...(/^\d+$/.test(q) ? [{ transactionId: Number(q) }] : []),
          { post: { item: { name: { contains: q, mode: 'insensitive' } } } },
          { buyer: { email: { contains: q, mode: 'insensitive' } } },
          { seller: { email: { contains: q, mode: 'insensitive' } } },
        ],
      }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { transactionId: 'desc' }],
        include: transactionRowInclude,
      }),
    ]);
    const locks = await findLockingReports(
      this.prisma,
      rows.map((t) => t.transactionId),
    );
    return new Paginated(
      rows.map((t) =>
        this.transactionRow(t, locks.get(t.transactionId) ?? null),
      ),
      { page, limit, total, totalPages: Math.ceil(total / limit) },
    );
  }

  private transactionRow(t: TransactionRow, lockingReportId: number | null) {
    return {
      transaction_id: t.transactionId,
      created_at: t.createdAt,
      status: t.status,
      kind: t.offerId === null ? ('buy' as const) : ('trade' as const),
      delivery_method: t.deliveryMethod,
      quantity: t.quantity ?? 1,
      total_amount: money(t.totalAmount),
      post_id: t.post.postId,
      item_id: t.post.item.itemId,
      item_name: t.post.item.name,
      category: t.post.item.category,
      image_url: t.post.item.images[0]?.imageUrl ?? null,
      buyer: userSummary(t.buyer),
      seller: userSummary(t.seller),
      locking_report_id: lockingReportId,
    };
  }

  async items(query: unknown) {
    const { page, limit, q, category, owner_id } = parse(itemsQuery, query);
    const where: Prisma.ItemWhereInput = {
      deletedAt: null,
      ...(category && { category }),
      ...(owner_id && { ownerId: owner_id }),
      ...(q && {
        OR: [
          ...(/^\d+$/.test(q) ? [{ itemId: Number(q) }] : []),
          { name: { contains: q, mode: 'insensitive' } },
          { owner: { email: { contains: q, mode: 'insensitive' } } },
        ],
      }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.item.count({ where }),
      this.prisma.item.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { itemId: 'desc' },
        select: {
          itemId: true,
          name: true,
          category: true,
          condition: true,
          quantity: true,
          status: true,
          createdAt: true,
          images: primaryImage,
          owner: { select: userSummarySelect },
          posts: {
            where: { deletedAt: null },
            select: {
              status: true,
              transactions: {
                where: { status: TransactionStatus.Completed },
                select: { quantity: true },
              },
            },
          },
        },
      }),
    ]);
    return new Paginated(
      rows.map((item) => ({
        item_id: item.itemId,
        name: item.name,
        category: item.category,
        condition: item.condition,
        quantity: item.quantity,
        status: item.status,
        created_at: item.createdAt,
        image_url: item.images[0]?.imageUrl ?? null,
        owner: userSummary(item.owner),
        active_post_count: item.posts.filter((p) => p.status === 'Active')
          .length,
        units_completed: item.posts
          .flatMap((p) => p.transactions)
          .reduce((sum, t) => sum + (t.quantity ?? 1), 0),
      })),
      { page, limit, total, totalPages: Math.ceil(total / limit) },
    );
  }

  /** One item down to each listing and each deal made on it. */
  async item(itemId: number) {
    const item = await this.prisma.item.findUnique({
      where: { itemId },
      include: {
        owner: { select: userSummarySelect },
        images: {
          where: { status: 'Active' },
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
        posts: { orderBy: { postId: 'desc' } },
        giveawayPosts: {
          orderBy: { giveawayId: 'desc' },
          select: {
            giveawayId: true,
            quantity: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);
    const transactions = await this.prisma.transaction.findMany({
      where: { post: { itemId } },
      orderBy: [{ createdAt: 'desc' }, { transactionId: 'desc' }],
      include: transactionRowInclude,
    });
    const locks = await findLockingReports(
      this.prisma,
      transactions.map((t) => t.transactionId),
    );
    return {
      item_id: item.itemId,
      name: item.name,
      category: item.category,
      condition: item.condition,
      quantity: item.quantity,
      description: item.description,
      status: item.status,
      created_at: item.createdAt,
      deleted_at: item.deletedAt,
      owner: userSummary(item.owner),
      images: item.images.map((image) => image.imageUrl),
      posts: item.posts.map((post) => ({
        post_id: post.postId,
        post_type: post.postType,
        status: post.status,
        price: post.price === null ? null : money(post.price),
        quantity_total: post.quantityTotal,
        quantity_remaining: post.quantityRemaining,
        created_at: post.createdAt,
        deleted_at: post.deletedAt,
      })),
      giveaways: item.giveawayPosts.map((giveaway) => ({
        giveaway_id: giveaway.giveawayId,
        quantity: giveaway.quantity,
        status: giveaway.status,
        created_at: giveaway.createdAt,
      })),
      transactions: transactions.map((t) =>
        this.transactionRow(t, locks.get(t.transactionId) ?? null),
      ),
    };
  }

  /** Every membership, not just the payments waiting for review. */
  async subscriptions(query: unknown) {
    const { page, limit, tier, status } = parse(subscriptionsQuery, query);
    const where: Prisma.SubscriptionWhereInput = {
      user: { isAdmin: false },
      ...(tier !== 'all' && { tier }),
      ...(status !== 'all' && { status }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { endDate: { sort: 'desc', nulls: 'last' } },
          { subscriptionId: 'desc' },
        ],
        include: {
          user: { select: userSummarySelect },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);
    // Counted the way `MembershipService.getStatus` counts it (posts created
    // since the first of the month, UTC); the stored counter is not kept up.
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const posts = await this.prisma.post.findMany({
      where: {
        createdAt: { gte: monthStart },
        item: { ownerId: { in: rows.map((r) => r.userId) } },
      },
      select: { item: { select: { ownerId: true } } },
    });
    const postsUsed = new Map<number, number>();
    for (const post of posts)
      postsUsed.set(
        post.item.ownerId,
        (postsUsed.get(post.item.ownerId) ?? 0) + 1,
      );
    return new Paginated(
      rows.map((subscription) => {
        const payment = subscription.payments[0];
        const effective = effectiveTier(subscription);
        return {
          subscription_id: subscription.subscriptionId,
          user: userSummary(subscription.user),
          tier: subscription.tier,
          effective_tier: effective,
          status: subscription.status,
          start_date: subscription.startDate,
          end_date: subscription.endDate,
          posts_used_this_month: postsUsed.get(subscription.userId) ?? 0,
          post_quota: MEMBERSHIP_CONFIG[effective].postQuota,
          latest_payment: payment
            ? {
                payment_id: payment.paymentId,
                amount: money(payment.amount),
                status: payment.status,
                created_at: payment.createdAt,
              }
            : null,
        };
      }),
      { page, limit, total, totalPages: Math.ceil(total / limit) },
    );
  }
}
