import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportStatus } from '../../generated/prisma/client';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  create(reporterId: number, dto: CreateReportDto) {
    return this.prisma.report.create({
      data: {
        reporter_id: reporterId,
        report_type: dto.report_type,
        target_id: dto.target_id,
        reason_category: dto.reason_category,
        details: dto.details,
        evidence_urls: dto.evidence_urls,
      },
    });
  }

  findAll() {
    return this.prisma.report.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  private async findOneOrThrow(reportId: number) {
    const report = await this.prisma.report.findUnique({
      where: { report_id: reportId },
    });
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    return report;
  }

  async resolve(reportId: number, adminId: number, dto: ResolveReportDto) {
    await this.findOneOrThrow(reportId);
    return this.prisma.report.update({
      where: { report_id: reportId },
      data: {
        status: dto.status,
        resolution_note: dto.resolution_note,
        handled_by: adminId,
        handled_at: new Date(),
      },
    });
  }

  async restore(reportId: number, adminId: number) {
    await this.findOneOrThrow(reportId);
    return this.prisma.report.update({
      where: { report_id: reportId },
      data: {
        status: ReportStatus.Report_Dismissed,
        resolution_note: 'Post restored — report deemed unfair by admin.',
        handled_by: adminId,
        handled_at: new Date(),
      },
    });
  }
}
