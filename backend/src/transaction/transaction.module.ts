import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  // AuthModule exports JwtAuthGuard (and the TokenService it depends on),
  // which the controller uses to authenticate every transaction endpoint.
  imports: [AuthModule],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
