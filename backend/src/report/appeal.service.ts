import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

    return this.prisma.appeal.update({
      where: { appeal_id: appealId },
      data: {
        status: dto.status,
        resolution_note: dto.resolution_note,
        handled_by: adminId,
        handled_at: new Date(),
      },
    });
  }
}
