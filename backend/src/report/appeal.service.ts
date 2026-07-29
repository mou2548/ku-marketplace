import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppealStatus, ReportStatus } from '../../generated/prisma/client';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { DecideAppealDto } from './dto/decide-appeal.dto';

const APPEAL_WINDOW_DAYS = 7;

@Injectable()
export class AppealService {
  constructor(private readonly prisma: PrismaService) {}

  async create(appellantId: number, dto: CreateAppealDto) {
    const report = await this.prisma.report.findUnique({
      where: { report_id: dto.report_id },
    });
    if (!report) {
      throw new NotFoundException(`Report ${dto.report_id} not found`);
    }
    if (report.target_id !== appellantId) {
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
