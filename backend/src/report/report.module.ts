import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { AppealController } from './appeal.controller';
import { AppealService } from './appeal.service';

@Module({
  controllers: [ReportController, AppealController],
  providers: [ReportService, AppealService],
})
export class ReportModule {}
