import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  AppealStatus,
  ReportStatus,
  ReportType,
  Sanction,
} from '../common/enums/report.enums';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { TransactionService } from '../transaction/transaction.service';
import { isLockingReason } from '../transaction/transaction-state';
import {
  notifyAdminsOfReport,
  notifyReinstated,
  notifySanctioned,
} from './moderation-notifications';
import {
  reportedUserId,
  standingFromVerdicts,
  suspensionEndsAt,
  verdictsAgainst,
} from './account-standing';
import {
  assertMessagesBelong,
  joinEvidence,
  loadEvidenceMessages,
  pickMessages,
  splitEvidence,
} from './report-evidence';
import { displayName } from '../common/utils/display-name';

/** The reason an admin-filed sanction carries (see `sanctionUser`). */
export const ADMIN_ACTION_REASON = 'Admin action';

/** §7.3 — block further reports once a user has filed more than 5 within
 * this window, so a bot or a stuck button can't flood the admin queue. */
const REPORT_RATE_LIMIT = 5;
const REPORT_RATE_WINDOW_SECONDS = 10 * 60;
const reportRateKey = (userId: number) => `report_rate:${userId}`;

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly redis: RedisService,
  ) {}

  private async assertUnderRateLimit(userId: number) {
    const key = reportRateKey(userId);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, REPORT_RATE_WINDOW_SECONDS);
    }
    if (count > REPORT_RATE_LIMIT) {
      throw new BadRequestException(
        `รายงานได้สูงสุด ${REPORT_RATE_LIMIT} ครั้งภายใน 10 นาที กรุณาลองใหม่ภายหลัง`,
      );
    }
  }

  private serializeUserSummary(user: {
    userId: number;
    firstNameEn: string;
    lastNameEn: string;
    firstNameTh?: string | null;
    lastNameTh?: string | null;
    emailVerifiedAt: Date | null;
    avatarUrl?: string | null;
  }) {
    return {
      user_id: user.userId,
      name: displayName(user),
      isVerified: user.emailVerifiedAt !== null,
      avatar_url: user.avatarUrl ?? null,
    };
  }

  private serializeReport(report: {
    reportId: number;
    reporterId: number;
    reportType: string;
    targetId: number;
    reasonCategory: string;
    details: string | null;
    evidenceUrls: unknown;
    status: string | null;
    sanction: string | null;
    handledBy: number | null;
    resolutionNote: string | null;
    handledAt: Date | null;
    createdAt: Date | null;
    reporter: {
      userId: number;
      firstNameEn: string;
      lastNameEn: string;
      emailVerifiedAt: Date | null;
    };
    handler: {
      userId: number;
      firstNameEn: string;
      lastNameEn: string;
      emailVerifiedAt: Date | null;
    } | null;
  }) {
    return {
      report_id: report.reportId,
      reporter_id: report.reporterId,
      reporter: this.serializeUserSummary(report.reporter),
      report_type: report.reportType,
      target_id: report.targetId,
      reason_category: report.reasonCategory,
      details: report.details,
      ...this.serializeEvidence(report.evidenceUrls),
      status: report.status,
      sanction: report.sanction,
      handled_by: report.handledBy,
      handler: report.handler
        ? this.serializeUserSummary(report.handler)
        : null,
      resolution_note: report.resolutionNote,
      handled_at: report.handledAt,
      created_at: report.createdAt,
    };
  }

  /** Photos and picked chat messages, split apart (see `report-evidence.ts`). */
  private serializeEvidence(stored: unknown) {
    const { urls, messageIds } = splitEvidence(stored);
    return {
      evidence_urls: urls.length ? urls : null,
      evidence_message_ids: messageIds,
    };
  }

  /**
   * The admin's view of reports: each one with the person it is against, so
   * a case shows both sides and the verdict names who it lands on. One query
   * for all the people, whatever the number of reports.
   */
  private async adminView(
    reports: Array<Parameters<ReportService['serializeReport']>[0]>,
  ) {
    const targetIds = await Promise.all(
      reports.map((report) => reportedUserId(this.prisma, report)),
    );
    const ids = [
      ...new Set(targetIds.filter((id): id is number => id !== undefined)),
    ];
    const users = ids.length
      ? await this.prisma.user.findMany({ where: { userId: { in: ids } } })
      : [];
    const byId = new Map(users.map((user) => [user.userId, user]));
    const picked = reports.map(
      (report) => splitEvidence(report.evidenceUrls).messageIds,
    );
    const messages = await loadEvidenceMessages(this.prisma, picked.flat());
    return reports.map((report, index) => {
      const target = byId.get(targetIds[index] ?? -1);
      return {
        ...this.serializeReport(report),
        reported_user: target
          ? { ...this.serializeUserSummary(target), status: target.status }
          : null,
        evidence_messages: pickMessages(messages, picked[index]),
      };
    });
  }

  /**
   * The reporter's own view (ruling of 2026-10-05): they see what they filed,
   * never the outcome — no status, verdict note, handler or decision time.
   */
  private serializeReporterView(
    report: Parameters<ReportService['serializeReport']>[0],
  ) {
    return {
      report_id: report.reportId,
      reporter_id: report.reporterId,
      reporter: this.serializeUserSummary(report.reporter),
      report_type: report.reportType,
      target_id: report.targetId,
      reason_category: report.reasonCategory,
      details: report.details,
      ...this.serializeEvidence(report.evidenceUrls),
      created_at: report.createdAt,
    };
  }

  private readonly reportInclude = { reporter: true, handler: true } as const;

  async create(reporterId: number, dto: CreateReportDto) {
    if (dto.reason_category === ADMIN_ACTION_REASON)
      throw new BadRequestException('This reason is reserved for admins');
    if (dto.report_type === ReportType.Transaction) {
      // The reasons the system files with lock a deal until an admin rules
      // (see transaction-state.ts), so a participant may not claim one.
      if (isLockingReason(dto.reason_category))
        throw new BadRequestException(
          'This reason is reserved for system reports',
        );
      const target = await this.prisma.transaction.findUnique({
        where: { transactionId: dto.target_id },
      });
      if (!target) throw new NotFoundException('Transaction not found');
      if (target.buyerId !== reporterId && target.sellerId !== reporterId)
        throw new ForbiddenException(
          'Only transaction participants may report it',
        );
    } else if (dto.report_type === ReportType.Post) {
      if (
        !(await this.prisma.post.findUnique({
          where: { postId: dto.target_id, deletedAt: null, status: 'Active' },
        }))
      )
        throw new NotFoundException('Post not found');
    } else if (
      !(await this.prisma.user.findUnique({ where: { userId: dto.target_id } }))
    ) {
      throw new NotFoundException('User not found');
    }
    await assertMessagesBelong(
      this.prisma,
      { reporterId, reportType: dto.report_type, targetId: dto.target_id },
      dto.evidence_message_ids ?? [],
    );
    await this.assertUnderRateLimit(reporterId);
    const report = await this.prisma.report.create({
      data: {
        reporterId: reporterId,
        reportType: dto.report_type,
        targetId: dto.target_id,
        reasonCategory: dto.reason_category,
        details: dto.details,
        evidenceUrls: joinEvidence(
          dto.evidence_urls,
          dto.evidence_message_ids && [...new Set(dto.evidence_message_ids)],
        ),
      },
      include: this.reportInclude,
    });
    await notifyAdminsOfReport(this.prisma, report);
    return this.serializeReporterView(report);
  }

  async findAll() {
    const reports = await this.prisma.report.findMany({
      include: this.reportInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.adminView(reports);
  }

  async findAllForUser(userId: number) {
    const reports = await this.prisma.report.findMany({
      where: { reporterId: userId },
      include: this.reportInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((report) => this.serializeReporterView(report));
  }

  async findOneForUser(reportId: number, userId: number) {
    const report = await this.prisma.report.findUnique({
      where: { reportId },
      include: this.reportInclude,
    });
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    if (report.reporterId !== userId) {
      throw new ForbiddenException('This report does not belong to you');
    }
    return this.serializeReporterView(report);
  }

  /**
   * The flow's "กดรับการรายงาน": the admin presses Take this report on the case
   * screen. A Pending report moves to Under_Investigation and the admin is
   * recorded in `handledBy`; `handledAt` stays null until the verdict. The
   * conditional update makes a repeated press harmless, and taking an already
   * taken or decided report changes nothing.
   */
  async open(reportId: number, adminId: number) {
    await this.findOneOrThrow(reportId);
    await this.prisma.report.updateMany({
      where: { reportId, status: ReportStatus.Pending },
      data: { status: ReportStatus.Under_Investigation, handledBy: adminId },
    });
    const report = await this.prisma.report.findUniqueOrThrow({
      where: { reportId },
      include: this.reportInclude,
    });
    return (await this.adminView([report]))[0];
  }

  private async findOneOrThrow(reportId: number) {
    const report = await this.prisma.report.findUnique({
      where: { reportId },
    });
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    return report;
  }

  // status comes back as `string | null` — init.sql stores it as VARCHAR(20)
  // with no NOT NULL, so the DB can't guarantee it's one of the enum values.
  private assertOpen(report: { reportId: number; status: string | null }) {
    if (
      report.status !== ReportStatus.Pending &&
      report.status !== ReportStatus.Under_Investigation
    ) {
      throw new BadRequestException(
        `Report ${report.reportId} has already been decided (status: ${report.status})`,
      );
    }
  }

  /**
   * `targetId` means a different thing per `reportType` — same resolution
   * `appeal.service.ts`'s `resolveReportedUserId` already does, duplicated
   * here rather than shared (matches this codebase's existing per-module
   * convention, e.g. `serializeUserSummary` appears in several services).
   */
  private resolveReportedUserId(report: {
    reportType: string;
    targetId: number;
    reporterId: number;
  }): Promise<number | undefined> {
    return reportedUserId(this.prisma, report);
  }

  /**
   * §7.1 — turns the admin's chosen sanction into an actual account effect.
   * `Warn`/`None` write nothing here; the verdict itself (`resolution_note`,
   * visible via `GET /reports`) is the warning. No new column for a
   * suspension's end date — `User.status` distinguishes `Suspended`
   * (temporary, ends `TEMPORARY_SUSPENSION_DAYS` after the verdict, see
   * `account-standing.ts`) from `Banned` (permanent), and `JwtAuthGuard`
   * blocks both outside the appeal routes.
   */
  private async applySanction(
    report: { reportType: string; targetId: number; reporterId: number },
    sanction: Sanction,
  ) {
    if (sanction === Sanction.None || sanction === Sanction.Warn) return;

    const userId = await this.resolveReportedUserId(report);
    if (userId === undefined) return;

    const existing = await this.prisma.user.findUnique({ where: { userId } });
    if (
      existing?.status === 'Deleted' ||
      (existing?.status === 'Banned' && sanction !== Sanction.Suspend_Permanent)
    )
      return;
    await this.prisma.user.update({
      where: { userId },
      data: {
        status:
          sanction === Sanction.Suspend_Permanent ? 'Banned' : 'Suspended',
      },
    });
  }

  /** §7.1 — a Post report confirmed as a violation hides that post; the
   * reverse (`restore`) is what makes that hide undoable when it turns out
   * the report was unfair. Uses the same `Post.status` soft-hide column
   * `posts.service.ts` already reads (`deletedAt` is a separate, harder
   * removal — this is just "stop showing it"). */
  private async setPostVisibility(
    report: { reportType: string; targetId: number },
    visible: boolean,
  ) {
    if (report.reportType !== ReportType.Post) return;
    if (
      visible &&
      (await this.prisma.report.count({
        where: {
          reportType: ReportType.Post,
          targetId: report.targetId,
          status: ReportStatus.Violation_Confirmed,
        },
      }))
    )
      return;
    await this.prisma.post.update({
      where: { postId: report.targetId },
      data: { status: visible ? 'Active' : 'Inactive' },
    });
  }

  /**
   * §7.4 — called by `appeal.service.ts` when an appeal is `Approved`
   * ("กลับคำตัดสิน" — reverse the decision). Reversing a verdict has to undo
   * whatever it actually did, not just flip the `Report` row back to
   * `Report_Dismissed` — otherwise an upheld appeal leaves the account
   * suspended/banned or the post hidden regardless. Only touches a `User`
   * that `resolve()` could plausibly have sanctioned (`Suspended`/`Banned`);
   * never reactivates one a person deleted themselves.
   */
  async undoConsequences(reportId: number) {
    const report = await this.findOneOrThrow(reportId);
    await this.setPostVisibility(report, true);

    const userId = await this.resolveReportedUserId(report);
    if (userId === undefined) return;
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (user?.status === 'Suspended' || user?.status === 'Banned') {
      // Whatever other verdicts still call for; an expired temporary
      // suspension no longer counts. A legacy verdict with no recorded
      // sanction (null) is not guessed safe to lift.
      const status =
        (await standingFromVerdicts(this.prisma, userId, {
          excludeReportId: reportId,
        })) ?? user.status;
      await this.prisma.user.update({ where: { userId }, data: { status } });
    }
  }

  async resolve(reportId: number, adminId: number, dto: ResolveReportDto) {
    const report = await this.findOneOrThrow(reportId);
    this.assertOpen(report);
    const resolved = await this.prisma.report.update({
      where: { reportId },
      data: {
        status: dto.status,
        sanction:
          dto.status === ReportStatus.Violation_Confirmed
            ? (dto.sanction ?? Sanction.None)
            : Sanction.None,
        resolutionNote: dto.resolution_note,
        handledBy: adminId,
        handledAt: new Date(),
      },
      include: this.reportInclude,
    });

    if (dto.status === ReportStatus.Violation_Confirmed) {
      const sanction = dto.sanction ?? Sanction.None;
      await this.setPostVisibility(report, false);
      await this.applySanction(report, sanction);
      const userId = await this.resolveReportedUserId(report);
      if (userId !== undefined && resolved.handledAt) {
        await notifySanctioned(this.prisma, userId, {
          reportId,
          reasonCategory: resolved.reasonCategory,
          resolutionNote: resolved.resolutionNote,
          sanction,
          handledAt: resolved.handledAt,
        });
      }
    }

    // §8.7 — if this report is a rejected cancellation, the ruling has to move
    // the transaction too, or it stays locked forever. Upholding the report
    // means the party who asked to cancel was right. No-op otherwise.
    await this.transactionService.settleReportedTransaction(
      reportId,
      dto.status === ReportStatus.Violation_Confirmed,
    );

    return (await this.adminView([resolved]))[0];
  }

  async restore(reportId: number, adminId: number) {
    const report = await this.findOneOrThrow(reportId);
    this.assertOpen(report);
    const restored = await this.prisma.report.update({
      where: { reportId },
      data: {
        status: ReportStatus.Report_Dismissed,
        resolutionNote: 'Post restored — report deemed unfair by admin.',
        handledBy: adminId,
        handledAt: new Date(),
      },
      include: this.reportInclude,
    });

    await this.setPostVisibility(report, true);

    // Dismissing here closes the dispute the same way, so unlock the
    // transaction rather than leaving it stranded.
    await this.transactionService.settleReportedTransaction(reportId, false);

    return (await this.adminView([restored]))[0];
  }

  /**
   * An admin suspends or bans an account from the Users screen (team ruling
   * 2026-10-27, replacing the 2026-10-05 one that only let an upheld appeal
   * touch an account). Recorded as a User report the admin files and confirms
   * in one step, so the account standing, the sanction notification and the
   * user's right to appeal all work exactly as for any other verdict.
   */
  async sanctionUser(
    userId: number,
    adminId: number,
    sanction:
      typeof Sanction.Suspend_Temporary | typeof Sanction.Suspend_Permanent,
    reason: string,
  ) {
    if (userId === adminId)
      throw new BadRequestException('You cannot suspend your own account');
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (user.isAdmin)
      throw new BadRequestException('An admin account cannot be suspended');
    if (user.status === 'Deleted')
      throw new BadRequestException('This account has been deleted');
    if (user.status === 'Banned')
      throw new BadRequestException('This account is already banned');

    const now = new Date();
    // The verdict and its effect land together, so a failure never leaves a
    // confirmed report on an account that was not actually suspended.
    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.report.create({
        data: {
          reporterId: adminId,
          reportType: ReportType.User,
          targetId: userId,
          reasonCategory: ADMIN_ACTION_REASON,
          details: reason,
          status: ReportStatus.Violation_Confirmed,
          sanction,
          resolutionNote: reason,
          handledBy: adminId,
          handledAt: now,
          createdAt: now,
        },
      });
      await tx.user.update({
        where: { userId },
        data: {
          status:
            sanction === Sanction.Suspend_Permanent ? 'Banned' : 'Suspended',
        },
      });
      return created;
    });
    await notifySanctioned(this.prisma, userId, {
      reportId: report.reportId,
      reasonCategory: report.reasonCategory,
      resolutionNote: report.resolutionNote,
      sanction,
      handledAt: now,
    });
    return {
      report_id: report.reportId,
      user_id: userId,
      sanction,
      status: sanction === Sanction.Suspend_Permanent ? 'Banned' : 'Suspended',
      ends_at:
        sanction === Sanction.Suspend_Temporary ? suspensionEndsAt(now) : null,
    };
  }

  /**
   * Lifts a suspension or ban by hand. Every verdict still holding the account
   * down is reversed the way an upheld appeal reverses one (the report becomes
   * `Report_Dismissed`), so nothing later recomputes the penalty back on, and
   * any appeal still open against those verdicts is closed as upheld: the
   * outcome it asked for has happened. A post hidden by one of those verdicts
   * stays hidden: lifting the account penalty is not a ruling on the post.
   */
  async reinstateUser(userId: number, adminId: number, note: string | null) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (user.status !== 'Suspended' && user.status !== 'Banned')
      throw new BadRequestException('This account is not suspended');

    const now = new Date();
    const holding = (await verdictsAgainst(this.prisma, userId)).filter(
      (v) =>
        v.sanction === null ||
        v.sanction === Sanction.Suspend_Permanent ||
        (v.sanction === Sanction.Suspend_Temporary &&
          (!v.handledAt || suspensionEndsAt(v.handledAt) > now)),
    );
    const reportIds = holding.map((v) => v.reportId);
    const reversal = note
      ? `Reversed — account reinstated by admin. ${note}`
      : 'Reversed — account reinstated by admin.';
    await this.prisma.$transaction([
      this.prisma.report.updateMany({
        where: { reportId: { in: reportIds } },
        data: {
          status: ReportStatus.Report_Dismissed,
          resolutionNote: reversal,
          handledBy: adminId,
        },
      }),
      this.prisma.appeal.updateMany({
        where: {
          reportId: { in: reportIds },
          status: { in: [AppealStatus.Pending, AppealStatus.Under_Review] },
        },
        data: {
          status: AppealStatus.Approved,
          resolutionNote: reversal,
          handledBy: adminId,
          handledAt: now,
        },
      }),
      this.prisma.user.update({
        where: { userId },
        data: { status: 'Active' },
      }),
    ]);
    await notifyReinstated(this.prisma, userId, { note, at: now });
    return {
      user_id: userId,
      status: 'Active',
      reversed_report_ids: holding.map((v) => v.reportId),
    };
  }
}
