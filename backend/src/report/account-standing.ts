import type { Prisma } from '@prisma/client';
import {
  ReportStatus,
  ReportType,
  Sanction,
} from '../common/enums/report.enums';

/**
 * An account's standing, worked out from the verdicts against it rather than
 * stored anywhere new (owner ruling 2026-10-06: no database changes).
 *
 * A temporary suspension lasts `TEMPORARY_SUSPENSION_DAYS` from the verdict's
 * `handled_at`. Nothing runs when it ends: login, token refresh and
 * `JwtAuthGuard` call `liftExpiredSuspension` whenever they meet a `Suspended`
 * account, so an expired suspension never blocks a request.
 *
 * Plain functions over a Prisma client, like `moderation-notifications.ts`,
 * because `AuthModule` cannot depend on `ReportModule` (which imports it).
 */
type Db = Prisma.TransactionClient;

export const TEMPORARY_SUSPENSION_DAYS = 3;

const DAY_MS = 86_400_000;

export type Standing = 'Active' | 'Suspended' | 'Banned';

export function suspensionEndsAt(handledAt: Date): Date {
  return new Date(handledAt.getTime() + TEMPORARY_SUSPENSION_DAYS * DAY_MS);
}

/** Who a report is against: the user, the post's owner, or the other party
 * to the transaction. */
export async function reportedUserId(
  db: Db,
  report: { reportType: string; targetId: number; reporterId: number },
): Promise<number | undefined> {
  if (report.reportType === ReportType.User) return report.targetId;
  if (report.reportType === ReportType.Post) {
    const post = await db.post.findUnique({
      where: { postId: report.targetId },
      select: { item: { select: { ownerId: true } } },
    });
    return post?.item.ownerId;
  }
  if (report.reportType === ReportType.Transaction) {
    const transaction = await db.transaction.findUnique({
      where: { transactionId: report.targetId },
      select: { buyerId: true, sellerId: true },
    });
    if (!transaction) return undefined;
    return transaction.buyerId === report.reporterId
      ? transaction.sellerId
      : transaction.buyerId;
  }
  return undefined;
}

/**
 * Every `Violation_Confirmed` report that is against this user, oldest first.
 * `excludeReportId` leaves out a verdict that is being reversed.
 */
export async function verdictsAgainst(
  db: Db,
  userId: number,
  { excludeReportId }: { excludeReportId?: number } = {},
) {
  const [posts, transactions] = await Promise.all([
    db.post.findMany({
      where: { item: { ownerId: userId } },
      select: { postId: true },
    }),
    db.transaction.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: { transactionId: true },
    }),
  ]);
  const candidates = await db.report.findMany({
    where: {
      status: ReportStatus.Violation_Confirmed,
      ...(excludeReportId !== undefined && {
        reportId: { not: excludeReportId },
      }),
      OR: [
        { reportType: ReportType.User, targetId: userId },
        {
          reportType: ReportType.Post,
          targetId: { in: posts.map((p) => p.postId) },
        },
        {
          reportType: ReportType.Transaction,
          targetId: { in: transactions.map((t) => t.transactionId) },
        },
      ],
    },
    orderBy: { reportId: 'asc' },
  });
  const verdicts: typeof candidates = [];
  for (const verdict of candidates) {
    // A transaction party who filed the report is not the one it is against.
    if ((await reportedUserId(db, verdict)) === userId) verdicts.push(verdict);
  }
  return verdicts;
}

/**
 * The standing the account's confirmed verdicts call for right now, or `null`
 * when a legacy verdict has no recorded sanction and it is not safe to guess.
 * `excludeReportId` leaves out a verdict that is being reversed.
 */
export async function standingFromVerdicts(
  db: Db,
  userId: number,
  {
    excludeReportId,
    now = new Date(),
  }: { excludeReportId?: number; now?: Date } = {},
): Promise<Standing | null> {
  const verdicts = await verdictsAgainst(db, userId, { excludeReportId });

  let standing: Standing = 'Active';
  for (const verdict of verdicts) {
    if (verdict.sanction === null) return null;
    if (verdict.sanction === Sanction.Suspend_Permanent) return 'Banned';
    if (
      verdict.sanction === Sanction.Suspend_Temporary &&
      // No decision time on a legacy row: treat the suspension as running.
      (!verdict.handledAt || suspensionEndsAt(verdict.handledAt) > now)
    ) {
      standing = 'Suspended';
    }
  }
  return standing;
}

/**
 * Returns the account's status after lifting a suspension whose time is up.
 * Only ever lifts: it never suspends or bans, and leaves every status other
 * than `Suspended` alone.
 */
export async function liftExpiredSuspension(
  db: Db,
  user: { userId: number; status: string | null },
): Promise<string | null> {
  if (user.status !== 'Suspended') return user.status;
  if ((await standingFromVerdicts(db, user.userId)) !== 'Active') {
    return user.status;
  }
  await db.user.updateMany({
    where: { userId: user.userId, status: 'Suspended' },
    data: { status: 'Active' },
  });
  return 'Active';
}
