import { TransactionDeadlineService } from './transaction-deadline.service';
import { NotificationsController } from './notifications.controller';
import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { AuthModule } from '../auth/auth.module';
import { RedisService } from '../redis/redis.service';

@Module({
  // AuthModule exports JwtAuthGuard (and the TokenService it depends on),
  // which the controller uses to authenticate every transaction endpoint.
  imports: [AuthModule],
  controllers: [TransactionController, NotificationsController],
  // RedisService is declared here rather than imported because there is no
  // RedisModule yet — AuthModule provides its own copy the same way. Worth
  // folding into a shared @Global() module once more than two modules need it.
  providers: [TransactionService, RedisService, TransactionDeadlineService],
  // ReportService calls settleCancellationDispute() when an admin closes a
  // report, so a ruling on a §8.7 dispute actually moves the transaction.
  exports: [TransactionService],
})
export class TransactionModule {}
