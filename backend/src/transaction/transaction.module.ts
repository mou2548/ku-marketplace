import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { AuthModule } from '../auth/auth.module';
import { RedisService } from '../redis/redis.service';

@Module({
  // AuthModule exports JwtAuthGuard (and the TokenService it depends on),
  // which the controller uses to authenticate every transaction endpoint.
  imports: [AuthModule],
  controllers: [TransactionController],
  // RedisService is declared here rather than imported because there is no
  // RedisModule yet — AuthModule provides its own copy the same way. Worth
  // folding into a shared @Global() module once more than two modules need it.
  providers: [TransactionService, RedisService],
})
export class TransactionModule {}
