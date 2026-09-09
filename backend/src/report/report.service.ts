import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  ReportStatus,
  ReportType,
  Sanction,
} from '../common/enums/report.enums';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { TransactionService } from '../transaction/transaction.service';

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
    emailVerifiedAt: Date | null;
  }) {
    return {
      user_id: user.userId,
      name: `${user.firstNameEn} ${user.lastNameEn}`.trim(),
      isVerified: user.emailVerifiedAt !== null,
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
      evidence_urls: report.evidenceUrls,
      status: report.status,
      handled_by: report.handledBy,
      handler: report.handler
        ? this.serializeUserSummary(report.handler)
        : null,
      resolution_note: report.resolutionNote,
      handled_at: report.handledAt,
      created_at: report.createdAt,
    };
  }

  private readonly reportInclude = { reporter: true, handler: true } as const;

  async create(reporterId: number, dto: CreateReportDto) {
    if (dto.report_type === ReportType.Transaction) {
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
    await this.assertUnderRateLimit(reporterId);
    const report = await this.prisma.report.create({
      data: {
        reporterId: reporterId,
        reportType: dto.report_type,
        targetId: dto.target_id,
        reasonCategory: dto.reason_category,
        details: dto.details,
        evidenceUrls: dto.evidence_urls,
      },
      include: this.reportInclude,
    });
    return this.serializeReport(report);
  }

  async findAll() {
    const reports = await this.prisma.report.findMany({
      include: this.reportInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((report) => this.serializeReport(report));
  }

  async findAllForUser(userId: number) {
    const reports = await this.prisma.report.findMany({
      where: { reporterId: userId },
      include: this.reportInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((report) => this.serializeReport(report));
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
    return this.serializeReport(report);
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
  private async resolveReportedUserId(report: {
    reportType: string;
    targetId: number;
    reporterId: number;
  }): Promise<number | undefined> {
    if (report.reportType === ReportType.User) {
      return report.targetId;
    }
    if (report.reportType === ReportType.Post) {
      const post = await this.prisma.post.findUnique({
        where: { postId: report.targetId },
        select: { item: { select: { ownerId: true } } },
      });
      return post?.item.ownerId;
    }
    if (report.reportType === ReportType.Transaction) {
      const transaction = await this.prisma.transaction.findUnique({
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
   * §7.1 — turns the admin's chosen sanction into an actual account effect.
   * `Warn`/`None` write nothing here; the verdict itself (`resolution_note`,
   * visible via `GET /reports`) is the warning. No new column for a
   * suspension's end date — `User.status` already distinguishes `Suspended`
   * (temporary, lifted manually) from `Banned` (permanent), and
   * `auth.service.ts`'s login already rejects both, so this is the entire
   * enforcement.
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
      const decisions = await this.prisma.report.findMany({
        where: {
          reportId: { not: reportId },
          status: ReportStatus.Violation_Confirmed,
        },
      });
      const remaining = [] as Array<string | null>;
      for (const decision of decisions) {
        if ((await this.resolveReportedUserId(decision)) === userId)
          remaining.push(decision.sanction);
      }
      // A legacy verdict has no recorded sanction; do not guess that it is safe to lift it.
      const status = remaining.includes(null)
        ? user.status
        : remaining.includes(Sanction.Suspend_Permanent)
          ? 'Banned'
          : remaining.includes(Sanction.Suspend_Temporary)
            ? 'Suspended'
            : 'Active';
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
      await this.setPostVisibility(report, false);
      await this.applySanction(report, dto.sanction ?? Sanction.None);
    }

    // §8.7 — if this report is a rejected cancellation, the ruling has to move
    // the transaction too, or it stays locked forever. Upholding the report
    // means the party who asked to cancel was right. No-op otherwise.
    await this.transactionService.settleCancellationDispute(
      reportId,
      dto.status === ReportStatus.Violation_Confirmed,
    );

    return this.serializeReport(resolved);
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
    await this.transactionService.settleCancellationDispute(reportId, false);

    return this.serializeReport(restored);
  }
}
