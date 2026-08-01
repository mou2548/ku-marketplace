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
   * `target_id` means a different thing per report_type, so the user the report
   * was actually filed against has to be resolved differently for each:
   *   User        → target_id is already the user_id
   *   Post        → target_id is a post_id; the reported party owns the item
   *   Transaction → target_id is a transaction_id; the reported party is the
   *                 counterparty, i.e. whichever side the reporter is not
   * Returns undefined when the target row no longer exists (deleted post, etc.).
   */
  private async resolveReportedUserId(report: {
    report_type: string;
    target_id: number;
    reporter_id: number;
  }): Promise<number | undefined> {
    if (report.report_type === ReportType.User) {
      return report.target_id;
    }

    if (report.report_type === ReportType.Post) {
      const post = await this.prisma.post.findUnique({
        where: { post_id: report.target_id },
        select: { Item: { select: { owner_id: true } } },
      });
      return post?.Item.owner_id;
    }

    if (report.report_type === ReportType.Transaction) {
      const transaction = await this.prisma.transaction.findUnique({
        where: { transaction_id: report.target_id },
        select: { buyer_id: true, seller_id: true },
      });
      if (!transaction) {
        return undefined;
      }
      return transaction.buyer_id === report.reporter_id
        ? transaction.seller_id
        : transaction.buyer_id;
    }

    return undefined;
  }

  async create(appellantId: number, dto: CreateAppealDto) {
    const report = await this.prisma.report.findUnique({
      where: { report_id: dto.report_id },
    });
    if (!report) {
      throw new NotFoundException(`Report ${dto.report_id} not found`);
    }
    const ownerId = await this.resolveReportedUserId(report);

    if (ownerId === undefined) {
      throw new NotFoundException(
        `No owner found for ${report.report_type} ${report.target_id}`,
      );
    }
    if (ownerId !== appellantId) {
      throw new ForbiddenException(
        'Only the user the report was filed against can appeal it',
      );
    }
    if (!report.handled_at) {
      throw new BadRequestException(
        'Report has not been resolved yet — nothing to appeal',
      );
    }

    const deadline = new Date(report.handled_at);
    deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
    if (new Date() > deadline) {
      throw new BadRequestException(
        `Appeal window closed — must appeal within ${APPEAL_WINDOW_DAYS} days of resolution`,
      );
    }

    const existingAppeal = await this.prisma.appeal.findFirst({
      where: { report_id: dto.report_id },
    });
    if (existingAppeal) {
      throw new BadRequestException(
        `Report ${dto.report_id} has already been appealed`,
      );
    }

    return this.prisma.appeal.create({
      data: {
        report_id: dto.report_id,
        appellant_id: appellantId,
        reason: dto.reason,
        evidence_urls: dto.evidence_urls,
        // Appeal.status is NOT NULL with no DB-level default in init.sql,
        // unlike Report.status — so the starting status must be set here.
        status: AppealStatus.Pending,
      },
    });
  }

  async decide(appealId: number, adminId: number, dto: DecideAppealDto) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { appeal_id: appealId },
      include: { report: true },
    });
    if (!appeal) {
      throw new NotFoundException(`Appeal ${appealId} not found`);
    }
    if (appeal.report.handled_by === adminId) {
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
        where: { appeal_id: appealId },
        data: {
          status: dto.status,
          resolution_note: dto.resolution_note,
          handled_by: adminId,
          handled_at: new Date(),
        },
      });

      if (dto.status === AppealStatus.Approved) {
        await tx.report.update({
          where: { report_id: appeal.report_id },
          data: {
            status: ReportStatus.Report_Dismissed,
            resolution_note: 'Report reversed — appeal approved.',
          },
        });
      }

      return updatedAppeal;
    });
  }
}
