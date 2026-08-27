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
} from '../common/enums/report.enums';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { DecideAppealDto } from './dto/decide-appeal.dto';

const APPEAL_WINDOW_DAYS = 7;

@Injectable()
export class AppealService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (!report.handledAt) {
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

    return this.prisma.appeal.create({
      data: {
        reportId: dto.report_id,
        appellantId: appellantId,
        reason: dto.reason,
        evidenceUrls: dto.evidence_urls,
        // Appeal.status is NOT NULL with no DB-level default in init.sql,
        // unlike Report.status — so the starting status must be set here.
        status: AppealStatus.Pending,
      },
    });
  }

  async decide(appealId: number, adminId: number, dto: DecideAppealDto) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { appealId },
      include: { report: true },
    });
    if (!appeal) {
      throw new NotFoundException(`Appeal ${appealId} not found`);
    }
    if (appeal.report.handledBy === adminId) {
      throw new BadRequestException(
        'Appeal must be decided by a different admin than the one who resolved the original report',
      );
    }
    if (
      appeal.status !== AppealStatus.Pending &&
      appeal.status !== AppealStatus.Under_Review
    ) {
      throw new BadRequestException(
        `Appeal ${appealId} has already been decided (status: ${appeal.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedAppeal = await tx.appeal.update({
        where: { appealId },
        data: {
          status: dto.status,
          resolutionNote: dto.resolution_note,
          handledBy: adminId,
          handledAt: new Date(),
        },
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

      return updatedAppeal;
    });
  }
}
