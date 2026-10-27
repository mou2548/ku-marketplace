import type { Prisma } from '@prisma/client';
import { Sanction } from '../common/enums/report.enums';
import {
  suspensionEndsAt,
  TEMPORARY_SUSPENSION_DAYS,
} from './account-standing';

/**
 * Persisted moderation notifications (rulings of 2026-10-05):
 *   - every active admin hears about a new report and a new appeal;
 *   - the penalised user hears about the verdict (any sanction, warn included)
 *     and the appeal result;
 *   - the reporter hears nothing about the outcome.
 *
 * Every event key starts with `moderation:` so `NotificationsController` can
 * tag the row with the right kind. Keys are unique per (event, recipient), and
 * `skipDuplicates` makes a retried write a no-op instead of an error.
 *
 * Takes a transaction client so callers inside `$transaction` notify
 * atomically with the change that caused the event; `PrismaService` satisfies
 * the same shape.
 */
type Db = Prisma.TransactionClient;

export const APPEAL_WINDOW_DAYS = 7;

/**
 * A warning cannot be appealed (owner's ruling of 2026-10-09, a deliberate
 * exception to the flow, which lets every upheld report be appealed). Every
 * other sanction, `none` included, keeps the 7-day appeal window.
 */
export const isAppealable = (sanction: string | null) =>
  sanction !== Sanction.Warn;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

async function activeAdminIds(db: Db) {
  const admins = await db.user.findMany({
    where: { isAdmin: true, status: 'Active' },
    select: { userId: true },
  });
  return admins.map((admin) => admin.userId);
}

export async function notifyAdminsOfReport(
  db: Db,
  report: {
    reportId: number;
    reasonCategory: string;
    reportType: string;
    targetId: number;
  },
) {
  const adminIds = await activeAdminIds(db);
  if (adminIds.length === 0) return;
  await db.notification.createMany({
    data: adminIds.map((userId) => ({
      userId,
      eventKey: `moderation:report:${report.reportId}:filed:${userId}`,
      title: `New report #${report.reportId}`,
      body: `${report.reasonCategory} (${report.reportType} #${report.targetId}).`,
      href: `/admin/reports/${report.reportId}`,
    })),
    skipDuplicates: true,
  });
}

export async function notifyAdminsOfAppeal(
  db: Db,
  appeal: { appealId: number; reportId: number },
) {
  const adminIds = await activeAdminIds(db);
  if (adminIds.length === 0) return;
  await db.notification.createMany({
    data: adminIds.map((userId) => ({
      userId,
      eventKey: `moderation:appeal:${appeal.appealId}:filed:${userId}`,
      title: `New appeal #${appeal.appealId}`,
      body: `Appeal against report #${appeal.reportId}.`,
      href: `/admin/appeals/${appeal.appealId}`,
    })),
    skipDuplicates: true,
  });
}

const SANCTION_TITLE: Record<Sanction, string> = {
  [Sanction.None]: 'A report against you was upheld',
  [Sanction.Warn]: 'You received a warning',
  [Sanction.Suspend_Temporary]: `Your account is suspended for ${TEMPORARY_SUSPENSION_DAYS} days`,
  [Sanction.Suspend_Permanent]: 'Your account is banned',
};

export async function notifySanctioned(
  db: Db,
  userId: number,
  report: {
    reportId: number;
    reasonCategory: string;
    resolutionNote: string | null;
    sanction: Sanction;
    handledAt: Date;
  },
) {
  const deadline = new Date(
    report.handledAt.getTime() + APPEAL_WINDOW_DAYS * 86400000,
  );
  await db.notification.createMany({
    data: [
      {
        userId,
        eventKey: `moderation:report:${report.reportId}:sanctioned:${userId}`,
        title: SANCTION_TITLE[report.sanction],
        body: [
          `Report #${report.reportId}: ${report.reasonCategory}.`,
          report.resolutionNote,
          report.sanction === Sanction.Suspend_Temporary
            ? `Your account is restored on ${isoDate(suspensionEndsAt(report.handledAt))}.`
            : null,
          isAppealable(report.sanction)
            ? `You can appeal until ${isoDate(deadline)}.`
            : null,
        ]
          .filter(Boolean)
          .join(' '),
        href: isAppealable(report.sanction) ? '/account/appeals' : '/account',
      },
    ],
    skipDuplicates: true,
  });
}

export async function notifyAppealDecided(
  db: Db,
  appeal: {
    appealId: number;
    reportId: number;
    appellantId: number;
    resolutionNote: string | null;
  },
  approved: boolean,
) {
  await db.notification.createMany({
    data: [
      {
        userId: appeal.appellantId,
        eventKey: `moderation:appeal:${appeal.appealId}:decided:${appeal.appellantId}`,
        title: approved ? 'Your appeal was upheld' : 'Your appeal was rejected',
        body: [
          approved
            ? `The penalty from report #${appeal.reportId} is lifted.`
            : `The penalty from report #${appeal.reportId} stays in place.`,
          appeal.resolutionNote,
        ]
          .filter(Boolean)
          .join(' '),
        href: '/account/appeals',
      },
    ],
    skipDuplicates: true,
  });
}

/** An admin lifted the account's suspension or ban by hand. Keyed by time, as
 * an account can be reinstated more than once. */
export async function notifyReinstated(
  db: Db,
  userId: number,
  { note, at }: { note: string | null; at: Date },
) {
  await db.notification.createMany({
    data: [
      {
        userId,
        eventKey: `moderation:user:${userId}:reinstated:${at.getTime()}`,
        title: 'Your account is restored',
        body: ['An admin lifted the penalty on your account.', note]
          .filter(Boolean)
          .join(' '),
        href: '/account',
      },
    ],
    skipDuplicates: true,
  });
}
