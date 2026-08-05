import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { AppealController } from './appeal.controller';
import { AppealService } from './appeal.service';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  // Closing a report has to settle any §8.7 cancellation dispute it represents,
  // otherwise the transaction stays locked forever after the admin rules.
  imports: [TransactionModule],
  controllers: [ReportController, AppealController],
  providers: [ReportService, AppealService],
})
export class ReportModule {}
