import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { AppealController } from './appeal.controller';
import { AppealService } from './appeal.service';
import { TransactionModule } from '../transaction/transaction.module';
import { AuthModule } from '../auth/auth.module';
import { RedisService } from '../redis/redis.service';

@Module({
  // TransactionModule: settling §8.7 disputes on report resolution.
  // AuthModule: JwtAuthGuard now replaces the MockAuthGuard placeholder.
  imports: [TransactionModule, AuthModule],
  controllers: [ReportController, AppealController],
  // RedisService declared here rather than imported — no shared RedisModule
  // yet, same as transaction.module.ts (§7.3 rate limit needs it now too).
  providers: [ReportService, AppealService, RedisService],
})
export class ReportModule {}
