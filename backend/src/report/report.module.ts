import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { AppealController } from './appeal.controller';
import { AppealService } from './appeal.service';
import { TransactionModule } from '../transaction/transaction.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  // TransactionModule: settling §8.7 disputes on report resolution.
  // AuthModule: JwtAuthGuard now replaces the MockAuthGuard placeholder.
  imports: [TransactionModule, AuthModule],
  controllers: [ReportController, AppealController],
  providers: [ReportService, AppealService],
})
export class ReportModule {}
