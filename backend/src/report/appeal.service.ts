import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AppealStatus,
  ReportStatus,
  ReportType,
  Sanction,
} from '../common/enums/report.enums';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { DecideAppealDto } from './dto/decide-appeal.dto';
import { ReportService } from './report.service';
import {
  APPEAL_WINDOW_DAYS,
  notifyAdminsOfAppeal,
  notifyAppealDecided,
} from './moderation-notifications';
import { suspensionEndsAt } from './account-standing';
import { displayName } from '../common/utils/display-name';

@Injectable()
export class AppealService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: ReportService,
  ) {}

  /**
   * `targetId` means a different thing per reportType, so the user the report
   * was actually filed against has to be resolved differently for each:
   *   User        → targetId is already the userId
   *   Post        → targetId is a postId; the reported party owns the item
   *   Transaction → targetId is a transactionId; the reported party is the
   *                 counterparty, i.e. whichever side the reporter is not
   * Returns undefined when the target row no longer exists (deleted post, etc.).
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
      if (!transaction) {
        return undefined;
      }
      return transaction.buyerId === report.reporterId
        ? transaction.sellerId
        : transaction.buyerId;
    }

    return undefined;
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

  private serializeAppeal(appeal: {
    appealId: number;
    reportId: number;
    appellantId: number;
    reason: string;
    evidenceUrls: unknown;
    status: string;
    handledBy: number | null;
    resolutionNote: string | null;
    createdAt: Date | null;
    handledAt: Date | null;
    appellant: {
      userId: number;
      firstNameEn: string;
      lastNameEn: string;
      emailVerifiedAt: Date | null;
    };
  }) {
    return {
      appeal_id: appeal.appealId,
      report_id: appeal.reportId,
      appellant_id: appeal.appellantId,
      appellant: this.serializeUserSummary(appeal.appellant),
      reason: appeal.reason,
      evidence_urls: appeal.evidenceUrls,
      status: appeal.status,
      handled_by: appeal.handledBy,
      resolution_note: appeal.resolutionNote,
      created_at: appeal.createdAt,
      handled_at: appeal.handledAt,
    };
  }

  private readonly appealInclude = { appellant: true } as const;

  private readonly adminAppealInclude = {
    appellant: true,
    report: { include: { handler: true } },
  } as const;

  /**
   * Admin view: the appeal plus the verdict it contests, so the reviewer sees
   * the original reasoning, sanction and evidence without a second lookup.
   */
  private serializeAdminAppeal(
    appeal: Parameters<AppealService['serializeAppeal']>[0] & {
      report: {
        reportId: number;
        reportType: string;
        targetId: number;
        reasonCategory: string;
        details: string | null;
        evidenceUrls: unknown;
        status: string | null;
        sanction: string | null;
        resolutionNote: string | null;
        handledBy: number | null;
        handledAt: Date | null;
        handler: Parameters<AppealService['serializeUserSummary']>[0] | null;
      };
    },
  ) {
    const { report } = appeal;
    return {
      ...this.serializeAppeal(appeal),
      report: {
        report_id: report.reportId,
        report_type: report.reportType,
        target_id: report.targetId,
        reason_category: report.reasonCategory,
        details: report.details,
        evidence_urls: report.evidenceUrls,
        status: report.status,
        sanction: report.sanction,
        resolution_note: report.resolutionNote,
        handled_by: report.handledBy,
        handler: report.handler
          ? this.serializeUserSummary(report.handler)
          : null,
        handled_at: report.handledAt,
      },
    };
  }

  async findEligible(userId: number) {
    const reports = await this.prisma.report.findMany({
      where: {
        status: ReportStatus.Violation_Confirmed,
        handledAt: {
          gte: new Date(Date.now() - APPEAL_WINDOW_DAYS * 86400000),
        },
        appeals: { none: {} },
      },
      orderBy: { handledAt: 'desc' },
    });
    const eligible: Array<{
      report_id: number;
      reason_category: string;
      resolution_note: string | null;
      sanction: string | null;
      /** When a temporary suspension ends; null for any other sanction. */
      suspended_until: Date | null;
      deadline: Date;
    }> = [];
    for (const report of reports) {
      if (
        (await this.resolveReportedUserId(report)) === userId &&
        report.handledAt
      ) {
        eligible.push({
          report_id: report.reportId,
          reason_category: report.reasonCategory,
          resolution_note: report.resolutionNote,
          sanction: report.sanction,
          suspended_until:
            report.sanction === Sanction.Suspend_Temporary
              ? suspensionEndsAt(report.handledAt)
              : null,
          deadline: new Date(
            report.handledAt.getTime() + APPEAL_WINDOW_DAYS * 86400000,
          ),
        });
      }
    }
    return eligible;
  }

  async findAllForUser(appellantId: number) {
    const appeals = await this.prisma.appeal.findMany({
      where: { appellantId },
      include: this.appealInclude,
      orderBy: { createdAt: 'desc' },
    });
    return appeals.map((appeal) => this.serializeAppeal(appeal));
  }

  async findAll() {
    const appeals = await this.prisma.appeal.findMany({
      include: this.adminAppealInclude,
      orderBy: { createdAt: 'desc' },
    });
    return appeals.map((appeal) => this.serializeAdminAppeal(appeal));
  }

  /**
   * The flow's "กดรับยื่นอุทธรณ์": the admin presses Take this appeal, same as
   * `ReportService.open`. A Pending appeal moves to Under_Review and the admin
   * is recorded in `handledBy` (`handledAt` stays null until the decision).
   * There is one admin, so the admin who decided the report also reviews the
   * appeal.
   */
  async open(appealId: number, adminId: number) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { appealId },
    });
    if (!appeal) {
      throw new NotFoundException(`Appeal ${appealId} not found`);
    }
    await this.prisma.appeal.updateMany({
      where: { appealId, status: AppealStatus.Pending },
      data: { status: AppealStatus.Under_Review, handledBy: adminId },
    });
    const opened = await this.prisma.appeal.findUniqueOrThrow({
      where: { appealId },
      include: this.adminAppealInclude,
    });
    return this.serializeAdminAppeal(opened);
  }

  async create(appellantId: number, dto: CreateAppealDto) {
    const report = await this.prisma.report.findUnique({
      where: { reportId: dto.report_id },
    });
    if (!report) {
      throw new NotFoundException(`Report ${dto.report_id} not found`);
    }
    const ownerId = await this.resolveReportedUserId(report);

    if (ownerId === undefined) {
      throw new NotFoundException(
        `No owner found for ${report.reportType} ${report.targetId}`,
      );
    }
    if (ownerId !== appellantId) {
      throw new ForbiddenException(
        'Only the user the report was filed against can appeal it',
      );
    }
    if (
      !report.handledAt ||
      report.status !== ReportStatus.Violation_Confirmed
    ) {
      throw new BadRequestException(
        'Report has not been resolved yet — nothing to appeal',
      );
    }

    const deadline = new Date(report.handledAt);
    deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
    if (new Date() > deadline) {
      throw new BadRequestException(
        `Appeal window closed — must appeal within ${APPEAL_WINDOW_DAYS} days of resolution`,
      );
    }

    const existingAppeal = await this.prisma.appeal.findFirst({
      where: { reportId: dto.report_id },
    });
    if (existingAppeal) {
      throw new BadRequestException(
        `Report ${dto.report_id} has already been appealed`,
      );
    }

    const created = await this.prisma.appeal.create({
      data: {
        reportId: dto.report_id,
        appellantId: appellantId,
        reason: dto.reason,
        evidenceUrls: dto.evidence_urls,
        // Appeal.status is NOT NULL with no DB-level default in init.sql,
        // unlike Report.status — so the starting status must be set here.
        status: AppealStatus.Pending,
      },
      include: this.appealInclude,
    });
    await notifyAdminsOfAppeal(this.prisma, created);
    return this.serializeAppeal(created);
  }

  async decide(appealId: number, adminId: number, dto: DecideAppealDto) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { appealId },
    });
    if (!appeal) {
      throw new NotFoundException(`Appeal ${appealId} not found`);
    }
    if (
      appeal.status !== AppealStatus.Pending &&
      appeal.status !== AppealStatus.Under_Review
    ) {
      throw new BadRequestException(
        `Appeal ${appealId} has already been decided (status: ${appeal.status})`,
      );
    }

    const updatedAppeal = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appeal.update({
        where: { appealId },
        data: {
          status: dto.status,
          resolutionNote: dto.resolution_note,
          handledBy: adminId,
          handledAt: new Date(),
        },
        include: this.appealInclude,
      });

      if (dto.status === AppealStatus.Approved) {
        await tx.report.update({
          where: { reportId: appeal.reportId },
          data: {
            status: ReportStatus.Report_Dismissed,
            resolutionNote: 'Report reversed — appeal approved.',
          },
        });
      }

      return updated;
    });

    // §7.4 — "reverse the decision" has to undo what the decision actually
    // did (a suspension, a ban, a hidden post), not just the Report row's own
    // status. Run after the transaction commits, same as `report.service.ts`'s
    // `resolve()` calling `settleReportedTransaction` outside its own update.
    if (dto.status === AppealStatus.Approved) {
      await this.reportService.undoConsequences(appeal.reportId);
    }
    await notifyAppealDecided(
      this.prisma,
      updatedAppeal,
      dto.status === AppealStatus.Approved,
    );

    return this.serializeAppeal(updatedAppeal);
  }
}
