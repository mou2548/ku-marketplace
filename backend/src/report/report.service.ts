import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportStatus } from '../common/enums/report.enums';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  create(reporterId: number, dto: CreateReportDto) {
    return this.prisma.report.create({
      data: {
        reporterId: reporterId,
        reportType: dto.report_type,
        targetId: dto.target_id,
        reasonCategory: dto.reason_category,
        details: dto.details,
        evidenceUrls: dto.evidence_urls,
      },
    });
  }

  findAll() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
    });
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

  async resolve(reportId: number, adminId: number, dto: ResolveReportDto) {
    const report = await this.findOneOrThrow(reportId);
    this.assertOpen(report);
    return this.prisma.report.update({
      where: { reportId },
      data: {
        status: dto.status,
        resolutionNote: dto.resolution_note,
        handledBy: adminId,
        handledAt: new Date(),
      },
    });
  }

  async restore(reportId: number, adminId: number) {
    const report = await this.findOneOrThrow(reportId);
    this.assertOpen(report);
    return this.prisma.report.update({
      where: { reportId },
      data: {
        status: ReportStatus.Report_Dismissed,
        resolutionNote: 'Post restored — report deemed unfair by admin.',
        handledBy: adminId,
        handledAt: new Date(),
      },
    });
  }
}
